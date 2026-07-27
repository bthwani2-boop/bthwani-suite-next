package fieldcommissionoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
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

func seedVisitFixture(t *testing.T, db *sql.DB) (storeID, agentID, visitID string) {
	t.Helper()
	ctx := context.Background()
	partnerID := uniqueID("field-commission-outbox-partner")
	storeID = uniqueID("field-commission-outbox-store")
	agentID = uniqueID("field-agent")
	phone := fmt.Sprintf("7%09d", time.Now().UnixNano()%1_000_000_000)

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partners
			(id, legal_name_ar, display_name, legal_identity_number, primary_phone, category)
		VALUES ($1, 'شريك اختبار عمولة الميداني', 'Field Commission Test Partner', $1, $2, 'restaurant')`,
		partnerID, phone); err != nil {
		t.Fatalf("failed to insert test partner: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_partners WHERE id = $1`, partnerID) })

	if _, err := db.ExecContext(ctx, `
		INSERT INTO dsh_stores
			(id, slug, display_name, status, city_code, service_area_code, serviceability_status, is_visible, partner_id)
		VALUES ($1, $1, 'Field Commission Outbox Test Store', 'active', 'SAN', 'SAN-1', 'serviceable', true, $2)`,
		storeID, partnerID); err != nil {
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
		if r.URL.Path != "/wlt/field-commissions" {
			t.Fatalf("expected /wlt/field-commissions, got %s", r.URL.Path)
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
	if gotBody["partnerId"] == "" || gotBody["partnerId"] == nil {
		t.Fatalf("expected partnerId to be projected, got %v", gotBody["partnerId"])
	}
	if gotBody["partnerCategory"] != "restaurant" {
		t.Fatalf("expected partnerCategory=restaurant, got %v", gotBody["partnerCategory"])
	}
	if gotBody["sourceEvidenceHash"] == "" || gotBody["sourceEvidenceHash"] == nil {
		t.Fatalf("expected immutable sourceEvidenceHash, got %v", gotBody["sourceEvidenceHash"])
	}
	if gotBody["idempotencyKey"] == "" || gotBody["idempotencyKey"] == nil {
		t.Fatalf("expected idempotencyKey, got %v", gotBody["idempotencyKey"])
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

func TestDeliverFieldCategoryCommissionErrorSurfacesToCaller(t *testing.T) {
	client := wlt.NewClient("http://127.0.0.1:0", "test-service-token")
	err := client.DeliverFieldCategoryCommission(context.Background(), wlt.DeliverFieldCategoryCommissionInput{
		BeneficiaryActorID: "field-x",
		VisitID:            "visit-x",
		StoreID:            "store-x",
		PartnerID:          "partner-x",
		PartnerCategory:    "restaurant",
	})
	if err == nil {
		t.Fatalf("expected error calling an unreachable WLT endpoint")
	}
}
