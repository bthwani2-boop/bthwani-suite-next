package fieldcommissionoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"dsh-api/internal/wlt"
)

func openRequiredDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func uniqueID(prefix string) string {
	return prefix + "-" + strconv.FormatInt(time.Now().UnixNano(), 10)
}

// seedVisitFixture creates the minimal store/field-visit chain the outbox's
// foreign key on visit_id requires, and registers cleanup.
func seedVisitFixture(t *testing.T, db *sql.DB) (storeID, agentID, visitID string) {
	t.Helper()
	ctx := context.Background()
	storeID = uniqueID("field-commission-outbox-store")
	agentID = uniqueID("field-agent")

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible)
		VALUES ($1, $1, 'Field Commission Outbox Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true)`,
		storeID); err != nil {
		t.Fatalf("failed to insert test store: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id = $1`, storeID) })

	if err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_field_visits (store_id, field_agent_id, visit_type, status)
		VALUES ($1, $2, 'onboarding', 'complete')
		RETURNING id::text`,
		storeID, agentID,
	).Scan(&visitID); err != nil {
		t.Fatalf("failed to insert test field visit: %v", err)
	}
	return storeID, agentID, visitID
}

func fetchOutboxRow(t *testing.T, db *sql.DB, id string) (status string, attemptCount int, lastError sql.NullString) {
	t.Helper()
	err := db.QueryRow(`
		SELECT status, attempt_count, last_error
		FROM dsh_field_commission_outbox WHERE id = $1::uuid`, id,
	).Scan(&status, &attemptCount, &lastError)
	if err != nil {
		t.Fatalf("failed to fetch outbox row %s: %v", id, err)
	}
	return
}

// TestProcessOnceDeliversAndMarksSentDBIntegration proves the end-to-end path:
// an enqueued event is claimed, delivered via a fake WLT server, and marked
// 'sent' — the same path that was previously missing entirely (no worker ever
// called ClaimBatch), which meant field commissions never reached WLT.
func TestProcessOnceDeliversAndMarksSentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	storeID, agentID, visitID := seedVisitFixture(t, db)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_commission_outbox WHERE visit_id = $1::uuid`, visitID) })

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{FieldActorID: agentID, VisitID: visitID, StoreID: storeID}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var gotBody map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/wlt/commissions" {
			t.Fatalf("expected /wlt/commissions, got %s", r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce failed: %v", err)
	}

	if gotBody["beneficiaryActorId"] != agentID {
		t.Fatalf("expected beneficiaryActorId=%q, got %v", agentID, gotBody["beneficiaryActorId"])
	}
	if gotBody["visitId"] != visitID {
		t.Fatalf("expected visitId=%q, got %v", visitID, gotBody["visitId"])
	}
	if gotBody["storeId"] != storeID {
		t.Fatalf("expected storeId=%q, got %v", storeID, gotBody["storeId"])
	}
	if gotBody["sourceType"] != "field_visit" {
		t.Fatalf("expected sourceType=field_visit, got %v", gotBody["sourceType"])
	}

	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_field_commission_outbox WHERE visit_id = $1::uuid`, visitID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, attemptCount, _ := fetchOutboxRow(t, db, id)
	if status != "sent" {
		t.Fatalf("expected status 'sent' after successful delivery, got %q", status)
	}
	if attemptCount != 0 {
		t.Fatalf("expected attempt_count to remain 0 after a first-try success, got %d", attemptCount)
	}
}

// TestProcessOnceMarksFailedWithoutMarkingSentDBIntegration proves a WLT-down
// scenario does not silently drop the event and does not falsely mark it sent.
func TestProcessOnceMarksFailedWithoutMarkingSentDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	storeID, agentID, visitID := seedVisitFixture(t, db)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_commission_outbox WHERE visit_id = $1::uuid`, visitID) })

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if err := Enqueue(tx, EnqueueInput{FieldActorID: agentID, VisitID: visitID, StoreID: storeID}); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := wlt.NewClient(server.URL, "test-service-token")
	if err := ProcessOnce(context.Background(), db, client); err != nil {
		t.Fatalf("ProcessOnce returned an error (it should log per-event failures, not fail the batch): %v", err)
	}

	var id string
	if err := db.QueryRow(`SELECT id::text FROM dsh_field_commission_outbox WHERE visit_id = $1::uuid`, visitID).Scan(&id); err != nil {
		t.Fatal(err)
	}
	status, attemptCount, lastError := fetchOutboxRow(t, db, id)
	if status != "pending" {
		t.Fatalf("expected event to remain 'pending' (never marked sent) after a failed delivery, got %q", status)
	}
	if attemptCount != 1 {
		t.Fatalf("expected attempt_count 1 after first failure, got %d", attemptCount)
	}
	if !lastError.Valid || lastError.String == "" {
		t.Fatalf("expected last_error to record the failure, got %+v", lastError)
	}
}

// TestDeliverFieldCommissionErrorSurfacesToCaller is a lightweight non-DB check
// that a transport failure calling WLT surfaces as a non-nil error, the
// precondition MarkFailed's caller relies on.
func TestDeliverFieldCommissionErrorSurfacesToCaller(t *testing.T) {
	client := wlt.NewClient("http://127.0.0.1:0", "test-service-token")
	err := client.DeliverFieldCommission(context.Background(), wlt.DeliverFieldCommissionInput{VisitID: "visit-x"})
	if err == nil {
		t.Fatalf("expected error calling an unreachable WLT endpoint")
	}
}
