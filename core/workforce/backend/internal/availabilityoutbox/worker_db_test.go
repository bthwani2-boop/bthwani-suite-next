package availabilityoutbox

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"workforce-api/internal/auth"
	"workforce-api/internal/dshclient"
)

func openWorkforceAvailabilityTestDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("WORKFORCE_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WORKFORCE_REQUIRE_DB_TESTS=true to run Workforce availability DB integration tests")
	}
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when WORKFORCE_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open Workforce availability database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping Workforce availability database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func TestAvailabilityOutboxSourceFencingLeaseRecoveryAndConcurrentClaim(t *testing.T) {
	db := openWorkforceAvailabilityTestDB(t)
	suffix := time.Now().UnixNano()
	actorID := fmt.Sprintf("availability-outbox-actor-%d", suffix)
	operatorContextID := fmt.Sprintf("availability-outbox-context-%d", suffix)
	providerCode := fmt.Sprintf("AVAIL-%d", suffix)
	startsAt := time.Date(2026, 8, 26, 8, 0, 0, 0, time.UTC)
	endsAt := startsAt.Add(time.Hour)

	_, err := db.Exec(`
		INSERT INTO workforce_people(
			operator_context_id, actor_id, full_name_ar, provider_code, workforce_kind,
			engagement_type, engagement_status
		) VALUES($1,$2,'اختبار التوفر',$3,'captain','independent_contractor','active')`,
		operatorContextID, actorID, providerCode)
	if err != nil {
		t.Fatalf("seed Workforce availability actor: %v", err)
	}
	var noticeID string
	if err := db.QueryRow(`
		INSERT INTO workforce_provider_availability_notices(
			actor_id, operator_context_id, notice_type, starts_at, ends_at,
			reason_code, note, created_by_actor_id
		) VALUES($1,$2,'short_break',$3,$4,'personal','initial',$1)
		RETURNING id::text`, actorID, operatorContextID, startsAt, endsAt).Scan(&noticeID); err != nil {
		t.Fatalf("seed Workforce availability notice: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM workforce_provider_availability_notices WHERE id=$1::uuid`, noticeID)
		_, _ = db.Exec(`DELETE FROM workforce_people WHERE actor_id=$1`, actorID)
	})

	var sourceVersion int64
	var lifecycleState, idempotencyKey string
	if err := db.QueryRow(`
		SELECT source_version, lifecycle_state, idempotency_key
		FROM workforce_dsh_availability_outbox WHERE notice_id=$1::uuid`, noticeID,
	).Scan(&sourceVersion, &lifecycleState, &idempotencyKey); err != nil {
		t.Fatalf("read transactional availability enqueue: %v", err)
	}
	if sourceVersion != 1 || lifecycleState != "pending" || idempotencyKey != dshclient.AvailabilityProjectionIdempotencyKey(operatorContextID, noticeID, 1) {
		t.Fatalf("initial outbox identity/state = version:%d state:%q key:%q", sourceVersion, lifecycleState, idempotencyKey)
	}

	claimed, err := claimBatchWithLease(t.Context(), db, 1, time.Minute)
	if err != nil || len(claimed) != 1 {
		t.Fatalf("initial claim = %d/%v, want one leased event", len(claimed), err)
	}
	oldEvent := claimed[0]

	if _, err := db.Exec(`UPDATE workforce_provider_availability_notices SET note='newer' WHERE id=$1::uuid`, noticeID); err != nil {
		t.Fatalf("update canonical notice: %v", err)
	}
	var newerVersion int64
	var newerState string
	var leaseToken sql.NullString
	if err := db.QueryRow(`
		SELECT source_version, lifecycle_state, lease_token::text
		FROM workforce_dsh_availability_outbox WHERE notice_id=$1::uuid`, noticeID,
	).Scan(&newerVersion, &newerState, &leaseToken); err != nil {
		t.Fatalf("read source update enqueue: %v", err)
	}
	if newerVersion != 2 || newerState != "pending" || leaseToken.Valid {
		t.Fatalf("source update did not replace the desired delivery: version:%d state:%q lease:%v", newerVersion, newerState, leaseToken)
	}

	if err := markSent(t.Context(), db, oldEvent, dshclient.AvailabilityProjectionResult{
		AvailabilityProjectionInput: dshclient.AvailabilityProjectionInput{
			OperatorContextID: operatorContextID,
			NoticeID:          noticeID,
			SourceVersion:     1,
			IdempotencyKey:    dshclient.AvailabilityProjectionIdempotencyKey(operatorContextID, noticeID, 1),
		},
	}); err != nil {
		t.Fatalf("stale acknowledgement transition: %v", err)
	}
	if err := db.QueryRow(`SELECT source_version, lifecycle_state FROM workforce_dsh_availability_outbox WHERE notice_id=$1::uuid`, noticeID).Scan(&sourceVersion, &lifecycleState); err != nil {
		t.Fatalf("read fenced acknowledgement result: %v", err)
	}
	if sourceVersion != 2 || lifecycleState != "pending" {
		t.Fatalf("stale acknowledgement changed canonical delivery: version:%d state:%q", sourceVersion, lifecycleState)
	}

	if _, err := db.Exec(`UPDATE workforce_provider_availability_notices SET note='newer' WHERE id=$1::uuid`, noticeID); err != nil {
		t.Fatalf("replay unchanged canonical notice: %v", err)
	}
	if err := db.QueryRow(`SELECT source_version FROM workforce_provider_availability_notices WHERE id=$1::uuid`, noticeID).Scan(&sourceVersion); err != nil {
		t.Fatalf("read unchanged source version: %v", err)
	}
	if sourceVersion != 2 {
		t.Fatalf("unchanged notice replay advanced source version to %d", sourceVersion)
	}

	start := make(chan struct{})
	claimedResults := make(chan []event, 2)
	claimErrors := make(chan error, 2)
	var group sync.WaitGroup
	for range 2 {
		group.Add(1)
		go func() {
			defer group.Done()
			<-start
			items, claimErr := claimBatchWithLease(t.Context(), db, 1, time.Minute)
			claimedResults <- items
			claimErrors <- claimErr
		}()
	}
	close(start)
	group.Wait()
	close(claimedResults)
	close(claimErrors)
	claimedCount := 0
	var recoveryEvent event
	for items := range claimedResults {
		claimedCount += len(items)
		if len(items) == 1 {
			recoveryEvent = items[0]
		}
	}
	for claimErr := range claimErrors {
		if claimErr != nil {
			t.Fatalf("concurrent claim failed: %v", claimErr)
		}
	}
	if claimedCount != 1 {
		t.Fatalf("concurrent claim count = %d, want exactly one owner", claimedCount)
	}

	if _, err := db.Exec(`
		UPDATE workforce_dsh_availability_outbox
		SET lifecycle_state='processing', lease_expires_at=NOW()-INTERVAL '1 second',
		    reconciliation_eligible=true, failure_disposition='reconciliation_required',
		    last_error='simulated process restart after remote success'
		WHERE notice_id=$1::uuid`, noticeID); err != nil {
		t.Fatalf("seed expired processing recovery state: %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || !strings.HasPrefix(r.URL.Path, "/dsh/internal/workforce/availability-projections/") {
			t.Fatalf("unexpected recovery request %s %s", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"availabilityProjection": dshclient.AvailabilityProjectionResult{
			AvailabilityProjectionInput: dshclient.AvailabilityProjectionInput{
				OperatorContextID: operatorContextID,
				NoticeID:          noticeID,
				ActorType:         recoveryEvent.ActorType,
				ActorID:           recoveryEvent.ActorID,
				NoticeType:        recoveryEvent.NoticeType,
				StartsAt:          recoveryEvent.StartsAt,
				EndsAt:            recoveryEvent.EndsAt,
				Status:            recoveryEvent.Status,
				Reason:            recoveryEvent.Reason,
				SourceVersion:     recoveryEvent.SourceVersion,
				SourceUpdatedAt:   recoveryEvent.SourceUpdatedAt,
				IdempotencyKey:    recoveryEvent.IdempotencyKey,
			},
			Idempotent: true,
		}})
	}))
	defer server.Close()

	client := dshclient.NewClient(server.URL, "dsh-token")
	if err := ProcessOnce(auth.WithOperatorContext(t.Context(), operatorContextID), db, client); err != nil {
		t.Fatalf("expired lease/readback recovery: %v", err)
	}
	var finalState, terminalDisposition string
	if err := db.QueryRow(`SELECT lifecycle_state, terminal_disposition FROM workforce_dsh_availability_outbox WHERE notice_id=$1::uuid`, noticeID).Scan(&finalState, &terminalDisposition); err != nil {
		t.Fatalf("read recovered outbox state: %v", err)
	}
	if finalState != "sent" || terminalDisposition != "delivered" {
		t.Fatalf("recovered outbox state = %q/%q, want sent/delivered", finalState, terminalDisposition)
	}
}
