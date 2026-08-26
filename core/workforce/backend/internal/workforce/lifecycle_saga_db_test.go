package workforce

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"workforce-api/internal/identityclient"
)

func openLifecycleSagaTestDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("WORKFORCE_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WORKFORCE_REQUIRE_DB_TESTS=true to run lifecycle saga DB integration tests")
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

func seedLifecyclePerson(t *testing.T, db *sql.DB, operatorContextID, actorID, status, suffix string) int {
	t.Helper()
	var version int
	if err := db.QueryRow(`
		INSERT INTO workforce_people(operator_context_id,actor_id,full_name_ar,workforce_code,workforce_kind,engagement_type,engagement_status)
		VALUES($1,$2,'اختبار دورة الحياة',$3,'captain','independent_contractor',$4)
		RETURNING version`,
		operatorContextID, actorID, "LIFE-"+suffix, status).Scan(&version); err != nil {
		t.Fatalf("seed person: %v", err)
	}
	return version
}

func seedLifecycleCommand(t *testing.T, db *sql.DB, operatorContextID, actorID, operation, fromStatus, toStatus, correlationID, suffix string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO workforce_lifecycle_commands(
			operator_context_id,actor_id,operation,from_status,to_status,person_version_after,
			reason,requested_by_actor_id,requested_by_role,correlation_id,command_idempotency_key,
			lifecycle_state,next_retry_at
		) VALUES($1,$2,$3,$4,$5,1,'governed lifecycle test intent',$6,'operator',$7,$8,'IN_FLIGHT',now())
		RETURNING id::text`,
		operatorContextID, actorID, operation, fromStatus, toStatus, actorID, correlationID,
		fmt.Sprintf("lifecycle-test:%s:%s", suffix, correlationID)).Scan(&id)
	if err != nil {
		t.Fatalf("seed lifecycle command: %v", err)
	}
	return id
}

func lifecycleCommandState(t *testing.T, db *sql.DB, commandID string) (state, disposition string) {
	t.Helper()
	if err := db.QueryRow(`SELECT lifecycle_state,terminal_disposition
		FROM workforce_lifecycle_commands WHERE id=$1::uuid`, commandID).Scan(&state, &disposition); err != nil {
		t.Fatalf("read lifecycle command state: %v", err)
	}
	return state, disposition
}

func personEngagementStatus(t *testing.T, db *sql.DB, operatorContextID, actorID string) string {
	t.Helper()
	var status string
	if err := db.QueryRow(`SELECT engagement_status FROM workforce_people
		WHERE operator_context_id=$1 AND actor_id=$2`, operatorContextID, actorID).Scan(&status); err != nil {
		t.Fatalf("read engagement status: %v", err)
	}
	return status
}

func countLifecycleAudit(t *testing.T, db *sql.DB, action string) int {
	t.Helper()
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM workforce_action_audit WHERE action=$1`, action).Scan(&count); err != nil {
		t.Fatalf("count audit rows: %v", err)
	}
	return count
}

func TestLifecycleSagaCrashRecoveryCompletes(t *testing.T) {
	db := openLifecycleSagaTestDB(t)
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "lifecycle-saga-context-" + suffix
	actorID := "lifecycle-saga-provider-" + suffix
	seedLifecyclePerson(t, db, operatorContextID, actorID, "suspended", suffix)
	commandID := seedLifecycleCommand(t, db, operatorContextID, actorID, "suspend", "active", "suspended", "corr-complete-"+suffix, suffix)

	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/internal/actors/") || !strings.HasSuffix(r.URL.Path, "/deactivate") {
			t.Errorf("unexpected identity call: %s", r.URL.Path)
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer identityServer.Close()
	identity := identityclient.NewClient(identityServer.URL, "identity-test-token")

	if _, err := ProcessLifecycleRecoveryPass(t.Context(), db, identity); err != nil {
		t.Fatalf("recovery pass: %v", err)
	}
	state, disposition := lifecycleCommandState(t, db, commandID)
	if state != "COMPLETED" || disposition != "identity_confirmed" {
		t.Fatalf("command must complete after recovery, got %s/%s", state, disposition)
	}
	if status := personEngagementStatus(t, db, operatorContextID, actorID); status != "suspended" {
		t.Fatalf("person must stay suspended after confirm, got %s", status)
	}
	if count := countLifecycleAudit(t, db, "workforce.suspend_identity_confirmed"); count != 1 {
		t.Fatalf("confirm audit must exist exactly once, got %d", count)
	}
}

func TestLifecycleSagaDefinitiveRejectionCompensates(t *testing.T) {
	db := openLifecycleSagaTestDB(t)
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "lifecycle-saga-context-" + suffix
	actorID := "lifecycle-saga-provider-" + suffix
	seedLifecyclePerson(t, db, operatorContextID, actorID, "suspended", suffix)
	commandID := seedLifecycleCommand(t, db, operatorContextID, actorID, "suspend", "active", "suspended", "corr-compensate-"+suffix, suffix)

	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`{"code":"ACTOR_STATE_CONFLICT"}`))
	}))
	defer identityServer.Close()
	identity := identityclient.NewClient(identityServer.URL, "identity-test-token")

	if _, err := ProcessLifecycleRecoveryPass(t.Context(), db, identity); err != nil {
		t.Fatalf("recovery pass: %v", err)
	}
	state, disposition := lifecycleCommandState(t, db, commandID)
	if state != "COMPENSATED" || disposition != "identity_rejected" {
		t.Fatalf("command must be compensated, got %s/%s", state, disposition)
	}
	if status := personEngagementStatus(t, db, operatorContextID, actorID); status != "active" {
		t.Fatalf("person must revert to active after definitive rejection, got %s", status)
	}
	if count := countLifecycleAudit(t, db, "workforce.suspend_reverted"); count != 1 {
		t.Fatalf("revert audit must exist exactly once, got %d", count)
	}
}

func TestLifecycleSagaSupersededNeverCallsIdentity(t *testing.T) {
	db := openLifecycleSagaTestDB(t)
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "lifecycle-saga-context-" + suffix
	actorID := "lifecycle-saga-provider-" + suffix
	// The person already moved back to active through a newer governed write,
	// while this suspend command was left IN_FLIGHT by a crash.
	seedLifecyclePerson(t, db, operatorContextID, actorID, "active", suffix)
	commandID := seedLifecycleCommand(t, db, operatorContextID, actorID, "suspend", "active", "suspended", "corr-superseded-"+suffix, suffix)

	var identityCalls atomic.Int32
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identityCalls.Add(1)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer identityServer.Close()
	identity := identityclient.NewClient(identityServer.URL, "identity-test-token")

	if _, err := ProcessLifecycleRecoveryPass(t.Context(), db, identity); err != nil {
		t.Fatalf("recovery pass: %v", err)
	}
	state, disposition := lifecycleCommandState(t, db, commandID)
	if state != "SUPERSEDED" {
		t.Fatalf("command must be superseded, got %s/%s", state, disposition)
	}
	if calls := identityCalls.Load(); calls != 0 {
		t.Fatalf("superseded command must never call identity, got %d calls", calls)
	}
	if status := personEngagementStatus(t, db, operatorContextID, actorID); status != "active" {
		t.Fatalf("person must stay active, got %s", status)
	}
}

func TestLifecycleSagaTransientRetriesThenCompletes(t *testing.T) {
	db := openLifecycleSagaTestDB(t)
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "lifecycle-saga-context-" + suffix
	actorID := "lifecycle-saga-provider-" + suffix
	seedLifecyclePerson(t, db, operatorContextID, actorID, "suspended", suffix)
	commandID := seedLifecycleCommand(t, db, operatorContextID, actorID, "suspend", "active", "suspended", "corr-transient-"+suffix, suffix)

	var identityCalls atomic.Int32
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if identityCalls.Add(1) == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"code":"SERVICE_UNAVAILABLE"}`))
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer identityServer.Close()
	identity := identityclient.NewClient(identityServer.URL, "identity-test-token")

	if _, err := ProcessLifecycleRecoveryPass(t.Context(), db, identity); err != nil {
		t.Fatalf("recovery pass 1: %v", err)
	}
	state, _ := lifecycleCommandState(t, db, commandID)
	if state != "RETRY_SCHEDULED" {
		t.Fatalf("transient failure must schedule a retry, got %s", state)
	}
	if status := personEngagementStatus(t, db, operatorContextID, actorID); status != "suspended" {
		t.Fatalf("person must stay suspended while retry is scheduled, got %s", status)
	}
	// Simulate the backoff window elapsing.
	if _, err := db.Exec(`UPDATE workforce_lifecycle_commands SET next_retry_at=now(), lease_expires_at=NULL
		WHERE id=$1::uuid`, commandID); err != nil {
		t.Fatalf("fast-forward retry window: %v", err)
	}
	if _, err := ProcessLifecycleRecoveryPass(t.Context(), db, identity); err != nil {
		t.Fatalf("recovery pass 2: %v", err)
	}
	state, disposition := lifecycleCommandState(t, db, commandID)
	if state != "COMPLETED" || disposition != "identity_confirmed" {
		t.Fatalf("command must complete after transient retry, got %s/%s", state, disposition)
	}
}
