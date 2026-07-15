package payout

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func insertTestWallet(t *testing.T, db *sql.DB, actorID, actorType string, available int64) {
	_, err := db.Exec(`
		INSERT INTO wlt_wallets (actor_id, actor_type, status, currency, available_balance_minor_units)
		VALUES ($1, $2, 'active', 'YER', $3)`, actorID, actorType, available)
	if err != nil {
		t.Fatalf("failed to insert test wallet: %v", err)
	}
}

// TestHandleCreatePayoutRequest_IdempotencyConflict verifies that reusing an
// Idempotency-Key with a different payload (different amount) is rejected
// with 409 IDEMPOTENCY_CONFLICT rather than returning the first request.
func TestHandleCreatePayoutRequest_IdempotencyConflict(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	actorID := fmt.Sprintf("actor-%d", time.Now().UnixNano())
	insertTestWallet(t, db, actorID, "captain", 10000)
	idemKey := fmt.Sprintf("idem-%d", time.Now().UnixNano())

	body1 := fmt.Sprintf(`{"beneficiaryActorId":%q,"beneficiaryActorType":"captain","amountMinorUnits":1000,"currency":"YER","idempotencyKey":%q}`, actorID, idemKey)
	req1 := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(body1))
	rec1 := httptest.NewRecorder()
	HandleCreatePayoutRequest(db).ServeHTTP(rec1, req1)
	if rec1.Code != http.StatusCreated {
		t.Fatalf("expected 201 on first create, got %d: %s", rec1.Code, rec1.Body.String())
	}

	// Same idempotency key, different amount -> conflict.
	body2 := fmt.Sprintf(`{"beneficiaryActorId":%q,"beneficiaryActorType":"captain","amountMinorUnits":2000,"currency":"YER","idempotencyKey":%q}`, actorID, idemKey)
	req2 := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(body2))
	rec2 := httptest.NewRecorder()
	HandleCreatePayoutRequest(db).ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusConflict {
		t.Fatalf("expected 409 IDEMPOTENCY_CONFLICT for reused key with different payload, got %d: %s", rec2.Code, rec2.Body.String())
	}

	// Same idempotency key, same payload -> returns the original (safe retry).
	req3 := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(body1))
	rec3 := httptest.NewRecorder()
	HandleCreatePayoutRequest(db).ServeHTTP(rec3, req3)
	if rec3.Code != http.StatusCreated {
		t.Fatalf("expected 201 (idempotent replay) for reused key with same payload, got %d: %s", rec3.Code, rec3.Body.String())
	}
}

// TestHandleListPayoutRequests_NoBeneficiaryNoServiceCaller_Rejected verifies
// that listing without beneficiaryActorId/beneficiaryActorType and without a
// service-caller header is rejected -- otherwise it would leak every
// beneficiary's payout requests to any caller.
func TestHandleListPayoutRequests_NoBeneficiaryNoServiceCaller_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	req := httptest.NewRequest(http.MethodGet, "/wlt/payout-requests", nil)
	rec := httptest.NewRecorder()
	HandleListPayoutRequests(db).ServeHTTP(rec, req)

	if rec.Code == http.StatusOK {
		t.Fatalf("expected list to be rejected without beneficiary scoping or service caller, got 200")
	}
}

// TestHandleListPayoutRequests_PartialBeneficiaryFilter_Rejected verifies
// that supplying only one of beneficiaryActorId/beneficiaryActorType is
// rejected rather than silently ignored.
func TestHandleListPayoutRequests_PartialBeneficiaryFilter_Rejected(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/wlt/payout-requests?beneficiaryActorId=captain-1", nil)
	rec := httptest.NewRecorder()
	HandleListPayoutRequests(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for partial beneficiary filter, got %d", rec.Code)
	}
}
