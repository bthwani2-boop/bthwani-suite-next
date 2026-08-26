package providerpenaltysaga

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
	"workforce-api/internal/wltclient"
)

func openProviderPenaltySagaTestDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("WORKFORCE_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WORKFORCE_REQUIRE_DB_TESTS=true to run provider-penalty saga DB integration tests")
	}
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when WORKFORCE_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open Workforce database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping Workforce database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func seedSagaIncident(t *testing.T, db *sql.DB, operatorContextID, actorID, incidentCode string) string {
	t.Helper()
	var incidentID string
	err := db.QueryRow(`INSERT INTO workforce_provider_incidents(
		operator_context_id,actor_id,incident_code,description,evidence_media_refs,status,policy_id,reported_by_actor_id
	) VALUES($1,$2,$3,'verified provider financial incident','["media-proof"]'::jsonb,'approved','penalty-default',$2)
	RETURNING id::text`, operatorContextID, actorID, incidentCode).Scan(&incidentID)
	if err != nil {
		t.Fatalf("seed provider incident: %v", err)
	}
	return incidentID
}

func commandState(t *testing.T, db *sql.DB, commandID string) (string, string) {
	t.Helper()
	var lifecycle, reconciliation string
	if err := db.QueryRow(`SELECT lifecycle_state,reconciliation_state
		FROM workforce_provider_penalty_commands WHERE id=$1::uuid`, commandID).Scan(&lifecycle, &reconciliation); err != nil {
		t.Fatalf("read command state: %v", err)
	}
	return lifecycle, reconciliation
}

func TestProviderPenaltySagaCrashRecoveryAndConcurrentAuthority(t *testing.T) {
	db := openProviderPenaltySagaTestDB(t)
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "penalty-saga-context-" + suffix
	providerActorID := "penalty-saga-provider-" + suffix
	requesterActorID := "penalty-saga-operator-" + suffix

	_, err := db.Exec(`INSERT INTO workforce_people(
		operator_context_id,actor_id,full_name_ar,workforce_code,workforce_kind,engagement_type,engagement_status
	) VALUES($1,$2,'اختبار ملحمة الجزاء',$3,'captain','independent_contractor','active')`,
		operatorContextID, providerActorID, "SAGA-"+suffix)
	if err != nil {
		t.Fatalf("seed provider: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM workforce_action_audit WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM workforce_provider_incident_transitions WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM workforce_provider_penalty_commands WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM workforce_provider_incidents WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM workforce_people WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, providerActorID)
	})

	incidentID := seedSagaIncident(t, db, operatorContextID, providerActorID, "INC-SAGA-"+suffix)
	ctx := auth.WithOperatorContext(t.Context(), operatorContextID)
	created := struct{ ID string }{}
	commandKey := fmt.Sprintf("workforce-provider-penalty:v1:%s:%s:1:post", operatorContextID, incidentID)
	err = db.QueryRow(`INSERT INTO workforce_provider_penalty_commands(
		operator_context_id,incident_id,incident_source_version,operation,requested_to_status,
		command_idempotency_key,client_idempotency_key,request_hash,provider_actor_id,provider_actor_type,
		policy_id,reason,requested_by_actor_id,requested_by_role,correlation_id,lifecycle_state
	) VALUES($1,$2::uuid,1,'post','financial_action_posted',$3,$4,$5,$6,'captain',
		'penalty-default','verified governed penalty',$7,'operator',$8,'READY') RETURNING id::text`,
		operatorContextID, incidentID, commandKey, "client-command-"+suffix, "request-hash-"+suffix,
		providerActorID, requesterActorID, "corr-"+suffix).Scan(&created.ID)
	if err != nil {
		t.Fatalf("record durable financial intent: %v", err)
	}

	start := make(chan struct{})
	claims := make(chan []command, 2)
	claimErrors := make(chan error, 2)
	var claimGroup sync.WaitGroup
	for worker := range 2 {
		claimGroup.Add(1)
		go func(owner string) {
			defer claimGroup.Done()
			<-start
			items, claimErr := claimBatch(ctx, db, owner, 1, time.Minute)
			claims <- items
			claimErrors <- claimErr
		}(fmt.Sprintf("concurrent-worker-%d", worker))
	}
	close(start)
	claimGroup.Wait()
	close(claims)
	close(claimErrors)
	claimedCount := 0
	for items := range claims {
		claimedCount += len(items)
	}
	for claimErr := range claimErrors {
		if claimErr != nil {
			t.Fatalf("concurrent claim: %v", claimErr)
		}
	}
	if claimedCount != 1 {
		t.Fatalf("two recovery workers claimed %d commands, want exactly one fenced owner", claimedCount)
	}

	// Window A: the process dies after durable intent/claim and before WLT. An
	// expired IN_FLIGHT lease must be reclaimed into authoritative readback.
	if _, err := db.Exec(`UPDATE workforce_provider_penalty_commands
		SET lease_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1::uuid`, created.ID); err != nil {
		t.Fatalf("inject crash after claim: %v", err)
	}

	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		actorID := strings.TrimPrefix(r.URL.Path, "/internal/actors/")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"actorId": actorID, "status": "ACTIVE", "roles": []string{"operator", "captain"}})
	}))
	defer identityServer.Close()
	identity := identityclient.NewClient(identityServer.URL, "identity-test-token")

	var storedMu sync.Mutex
	var stored wltclient.SagaProviderPenalty
	var postCalls atomic.Int32
	var reverseCalls atomic.Int32
	wltServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		storedMu.Lock()
		defer storedMu.Unlock()
		switch {
		case r.Method == http.MethodGet:
			if stored.ID == "" {
				http.Error(w, `{"code":"NOT_FOUND"}`, http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"providerPenalty": stored})
		case r.Method == http.MethodPost && r.URL.Path == "/wlt/provider-penalties":
			var input wltclient.PostPenaltyInput
			if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
				t.Fatalf("decode WLT post: %v", err)
			}
			postCalls.Add(1)
			stored = wltclient.SagaProviderPenalty{
				ID: "wpen-" + suffix, IncidentID: input.IncidentID, ProviderActorID: input.ProviderActorID,
				ProviderActorType: input.ProviderActorType, PolicyID: input.PolicyID, Status: "posted",
				LedgerTransactionID: "wlt-ledger-" + suffix, IdempotencyKey: r.Header.Get("Idempotency-Key"),
			}
			// Windows B/D: WLT committed, but the response is unusable. The
			// client must classify this as UNKNOWN, never as safe-to-retry.
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"providerPenalty":`))
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/reverse"):
			reverseCalls.Add(1)
			stored.Status = "reversed"
			stored.ReversalIdempotencyKey = r.Header.Get("Idempotency-Key")
			stored.ReversalLedgerTransactionID = "wlt-reversal-ledger-" + suffix
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"providerPenalty":`))
		default:
			http.Error(w, `{"code":"UNEXPECTED_ROUTE"}`, http.StatusBadRequest)
		}
	}))
	defer wltServer.Close()
	wlt := wltclient.NewClient(wltServer.URL, "wlt-test-token")

	if err := ProcessOnce(ctx, db, identity, wlt, "restart-worker-a"); err != nil {
		t.Fatalf("recover pre-call crash through absence readback: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, created.ID); lifecycle != "READY" || reconciliation != "ABSENT" {
		t.Fatalf("pre-call crash recovery = %s/%s, want READY/ABSENT", lifecycle, reconciliation)
	}
	if err := ProcessOnce(ctx, db, identity, wlt, "restart-worker-b"); err != nil {
		t.Fatalf("classify lost response: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, created.ID); lifecycle != "REMOTE_OUTCOME_UNKNOWN" || reconciliation != "REQUIRED" {
		t.Fatalf("lost response state = %s/%s, want REMOTE_OUTCOME_UNKNOWN/REQUIRED", lifecycle, reconciliation)
	}
	if postCalls.Load() != 1 {
		t.Fatalf("lost response caused %d WLT posts, want one", postCalls.Load())
	}

	if _, err := db.Exec(`UPDATE workforce_provider_penalty_commands SET next_retry_at=NOW() WHERE id=$1::uuid`, created.ID); err != nil {
		t.Fatal(err)
	}
	if err := ProcessOnce(ctx, db, identity, wlt, "reconciliation-worker"); err != nil {
		t.Fatalf("authoritative WLT readback: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, created.ID); lifecycle != "REMOTE_CONFIRMED" || reconciliation != "FOUND" {
		t.Fatalf("readback state = %s/%s, want REMOTE_CONFIRMED/FOUND", lifecycle, reconciliation)
	}
	var incidentStatus string
	if err := db.QueryRow(`SELECT status FROM workforce_provider_incidents WHERE id=$1::uuid`, incidentID).Scan(&incidentStatus); err != nil {
		t.Fatal(err)
	}
	if incidentStatus != "approved" {
		t.Fatalf("remote confirmation changed operational truth before atomic projection: %s", incidentStatus)
	}

	// Windows C/I: restart after remote success and before local projection.
	if err := ProcessOnce(ctx, db, identity, wlt, "projection-after-restart"); err != nil {
		t.Fatalf("project confirmed WLT result after restart: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, created.ID); lifecycle != "COMPLETED" || reconciliation != "FOUND" {
		var code, detail string
		_ = db.QueryRow(`SELECT last_error_code,last_error FROM workforce_provider_penalty_commands WHERE id=$1::uuid`, created.ID).Scan(&code, &detail)
		t.Fatalf("terminal state = %s/%s, want COMPLETED/FOUND; last error=%s: %s", lifecycle, reconciliation, code, detail)
	}
	if err := db.QueryRow(`SELECT status FROM workforce_provider_incidents WHERE id=$1::uuid`, incidentID).Scan(&incidentStatus); err != nil {
		t.Fatal(err)
	}
	if incidentStatus != "financial_action_posted" {
		t.Fatalf("final operational projection = %s, want financial_action_posted", incidentStatus)
	}
	var transitionCount, auditCount int
	if err := db.QueryRow(`SELECT
		(SELECT COUNT(*) FROM workforce_provider_incident_transitions WHERE financial_command_id=$1::uuid),
		(SELECT COUNT(*) FROM workforce_action_audit WHERE financial_command_id=$1::uuid)`, created.ID).Scan(&transitionCount, &auditCount); err != nil {
		t.Fatal(err)
	}
	if transitionCount != 1 || auditCount != 1 {
		t.Fatalf("atomic projection evidence = transitions:%d audit:%d, want exactly one each", transitionCount, auditCount)
	}
	if postCalls.Load() != 1 {
		t.Fatalf("eventual convergence duplicated WLT mutation: posts=%d", postCalls.Load())
	}

	var reverseCommandID string
	reverseKey := fmt.Sprintf("workforce-provider-penalty:v1:%s:%s:2:reverse", operatorContextID, incidentID)
	err = db.QueryRow(`INSERT INTO workforce_provider_penalty_commands(
		operator_context_id,incident_id,incident_source_version,operation,requested_to_status,
		command_idempotency_key,client_idempotency_key,request_hash,provider_actor_id,provider_actor_type,
		policy_id,reason,requested_by_actor_id,requested_by_role,correlation_id,parent_command_id,lifecycle_state
	) VALUES($1,$2::uuid,2,'reverse','reversed',$3,$4,$5,$6,'captain',
		'penalty-default','governed penalty reversal',$7,'operator',$8,$9::uuid,'READY') RETURNING id::text`,
		operatorContextID, incidentID, reverseKey, "client-reverse-"+suffix, "reverse-request-hash-"+suffix,
		providerActorID, requesterActorID, "corr-reverse-"+suffix, created.ID).Scan(&reverseCommandID)
	if err != nil {
		t.Fatalf("record durable reversal intent: %v", err)
	}
	if err := ProcessOnce(ctx, db, identity, wlt, "reverse-response-loss"); err != nil {
		t.Fatalf("classify reversal response loss: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, reverseCommandID); lifecycle != "REMOTE_OUTCOME_UNKNOWN" || reconciliation != "REQUIRED" {
		t.Fatalf("lost reversal response = %s/%s, want REMOTE_OUTCOME_UNKNOWN/REQUIRED", lifecycle, reconciliation)
	}
	if reverseCalls.Load() != 1 {
		t.Fatalf("reversal response loss issued %d WLT reversals, want one", reverseCalls.Load())
	}
	if _, err := db.Exec(`UPDATE workforce_provider_penalty_commands SET next_retry_at=NOW() WHERE id=$1::uuid`, reverseCommandID); err != nil {
		t.Fatal(err)
	}
	if err := ProcessOnce(ctx, db, identity, wlt, "reverse-readback"); err != nil {
		t.Fatalf("authoritative reversal readback: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, reverseCommandID); lifecycle != "REMOTE_CONFIRMED" || reconciliation != "FOUND" {
		t.Fatalf("reversal readback = %s/%s, want REMOTE_CONFIRMED/FOUND", lifecycle, reconciliation)
	}
	if err := ProcessOnce(ctx, db, identity, wlt, "reverse-projection-after-restart"); err != nil {
		t.Fatalf("project confirmed reversal after restart: %v", err)
	}
	if lifecycle, reconciliation := commandState(t, db, reverseCommandID); lifecycle != "COMPLETED" || reconciliation != "FOUND" {
		t.Fatalf("terminal reversal = %s/%s, want COMPLETED/FOUND", lifecycle, reconciliation)
	}
	if err := db.QueryRow(`SELECT status FROM workforce_provider_incidents WHERE id=$1::uuid`, incidentID).Scan(&incidentStatus); err != nil {
		t.Fatal(err)
	}
	if incidentStatus != "reversed" || reverseCalls.Load() != 1 {
		t.Fatalf("reversal convergence = status:%s calls:%d, want reversed/1", incidentStatus, reverseCalls.Load())
	}
}
