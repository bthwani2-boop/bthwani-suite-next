package payout

import (
	"database/sql"
	"encoding/json"
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

func createTestPayoutRequest(t *testing.T, db *sql.DB, actorID string, amount int64) string {
	idemKey := fmt.Sprintf("idem-%d", time.Now().UnixNano())
	body := fmt.Sprintf(`{"beneficiaryActorId":%q,"beneficiaryActorType":"captain","amountMinorUnits":%d,"currency":"YER","idempotencyKey":%q}`, actorID, amount, idemKey)
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(body))
	rec := httptest.NewRecorder()
	HandleCreatePayoutRequest(db).ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("failed to create test payout request: %d %s", rec.Code, rec.Body.String())
	}
	var resp PayoutRequestResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}
	return resp.PayoutRequest.ID
}

func withPathValue(req *http.Request, key, value string) *http.Request {
	req.SetPathValue(key, value)
	return req
}

// TestPayoutApproveComplete_RecordsOperatorIds verifies that approving and
// completing a payout request records the operator id supplied in the
// request body against the transition-specific column (approved_by /
// completed_by), not just the legacy shared operator_id column.
func TestPayoutApproveComplete_RecordsOperatorIds(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	actorID := fmt.Sprintf("actor-%d", time.Now().UnixNano())
	insertTestWallet(t, db, actorID, "captain", 10000)
	payoutID := createTestPayoutRequest(t, db, actorID, 1000)

	approveReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/approve", strings.NewReader(`{"operatorId":"operator-alice"}`)), "payoutId", payoutID)
	approveRec := httptest.NewRecorder()
	HandleApprovePayoutRequest(db).ServeHTTP(approveRec, approveReq)
	if approveRec.Code != http.StatusOK {
		t.Fatalf("approve failed: %d %s", approveRec.Code, approveRec.Body.String())
	}
	var approveResp PayoutRequestResponse
	if err := json.Unmarshal(approveRec.Body.Bytes(), &approveResp); err != nil {
		t.Fatalf("failed to decode approve response: %v", err)
	}
	if approveResp.PayoutRequest.ApprovedByOperatorID != "operator-alice" {
		t.Fatalf("expected approvedByOperatorId 'operator-alice', got %q", approveResp.PayoutRequest.ApprovedByOperatorID)
	}

	processReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/process", strings.NewReader(`{"operatorId":"operator-alice"}`)), "payoutId", payoutID)
	processRec := httptest.NewRecorder()
	HandleProcessPayoutRequest(db).ServeHTTP(processRec, processReq)
	if processRec.Code != http.StatusOK {
		t.Fatalf("process failed: %d %s", processRec.Code, processRec.Body.String())
	}

	completeReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/complete", strings.NewReader(`{"operatorId":"operator-bob"}`)), "payoutId", payoutID)
	completeRec := httptest.NewRecorder()
	HandleCompletePayoutRequest(db).ServeHTTP(completeRec, completeReq)
	if completeRec.Code != http.StatusOK {
		t.Fatalf("complete failed: %d %s", completeRec.Code, completeRec.Body.String())
	}
	var completeResp PayoutRequestResponse
	if err := json.Unmarshal(completeRec.Body.Bytes(), &completeResp); err != nil {
		t.Fatalf("failed to decode complete response: %v", err)
	}
	if completeResp.PayoutRequest.CompletedByOperatorID != "operator-bob" {
		t.Fatalf("expected completedByOperatorId 'operator-bob', got %q", completeResp.PayoutRequest.CompletedByOperatorID)
	}
}

// TestPayoutComplete_PostsBalancedLedgerTransaction verifies that completing
// a payout request posts a balanced (debit == credit) ledger transaction
// referencing the payout request, rather than only mutating wallet counters.
func TestPayoutComplete_PostsBalancedLedgerTransaction(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	actorID := fmt.Sprintf("actor-%d", time.Now().UnixNano())
	insertTestWallet(t, db, actorID, "captain", 10000)
	payoutID := createTestPayoutRequest(t, db, actorID, 2500)

	approveReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/approve", strings.NewReader(`{}`)), "payoutId", payoutID)
	HandleApprovePayoutRequest(db).ServeHTTP(httptest.NewRecorder(), approveReq)
	processReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/process", strings.NewReader(`{}`)), "payoutId", payoutID)
	HandleProcessPayoutRequest(db).ServeHTTP(httptest.NewRecorder(), processReq)
	completeReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/complete", strings.NewReader(`{}`)), "payoutId", payoutID)
	completeRec := httptest.NewRecorder()
	HandleCompletePayoutRequest(db).ServeHTTP(completeRec, completeReq)
	if completeRec.Code != http.StatusOK {
		t.Fatalf("complete failed: %d %s", completeRec.Code, completeRec.Body.String())
	}

	var txnID string
	if err := db.QueryRow("SELECT id FROM wlt_ledger_transactions WHERE reference_type = 'payout_request' AND reference_id = $1", payoutID).Scan(&txnID); err != nil {
		t.Fatalf("expected a ledger transaction referencing this payout request: %v", err)
	}

	var debitTotal, creditTotal int64
	if err := db.QueryRow("SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1 AND debit_credit = 'debit'", txnID).Scan(&debitTotal); err != nil {
		t.Fatalf("failed to sum debit lines: %v", err)
	}
	if err := db.QueryRow("SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1 AND debit_credit = 'credit'", txnID).Scan(&creditTotal); err != nil {
		t.Fatalf("failed to sum credit lines: %v", err)
	}
	if debitTotal != 2500 || creditTotal != 2500 {
		t.Fatalf("expected balanced 2500/2500 debit/credit, got debit=%d credit=%d", debitTotal, creditTotal)
	}
}

// TestPayoutComplete_MakerCheckerViolation_RejectedWhenEnforced verifies that
// when WLT_MAKER_CHECKER_ENFORCED=true, the same operator id cannot both
// approve and complete a payout request.
func TestPayoutComplete_MakerCheckerViolation_RejectedWhenEnforced(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	t.Setenv("WLT_MAKER_CHECKER_ENFORCED", "true")

	actorID := fmt.Sprintf("actor-%d", time.Now().UnixNano())
	insertTestWallet(t, db, actorID, "captain", 10000)
	payoutID := createTestPayoutRequest(t, db, actorID, 1000)

	approveReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/approve", strings.NewReader(`{"operatorId":"operator-alice"}`)), "payoutId", payoutID)
	approveRec := httptest.NewRecorder()
	HandleApprovePayoutRequest(db).ServeHTTP(approveRec, approveReq)
	if approveRec.Code != http.StatusOK {
		t.Fatalf("approve failed: %d %s", approveRec.Code, approveRec.Body.String())
	}

	processReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/process", strings.NewReader(`{"operatorId":"operator-alice"}`)), "payoutId", payoutID)
	processRec := httptest.NewRecorder()
	HandleProcessPayoutRequest(db).ServeHTTP(processRec, processReq)
	if processRec.Code != http.StatusOK {
		t.Fatalf("process failed: %d %s", processRec.Code, processRec.Body.String())
	}

	// Same operator ("operator-alice") tries to complete what they approved.
	completeReq := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/complete", strings.NewReader(`{"operatorId":"operator-alice"}`)), "payoutId", payoutID)
	completeRec := httptest.NewRecorder()
	HandleCompletePayoutRequest(db).ServeHTTP(completeRec, completeReq)
	if completeRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 maker/checker violation, got %d: %s", completeRec.Code, completeRec.Body.String())
	}

	// A different operator can complete it.
	completeReq2 := withPathValue(httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/complete", strings.NewReader(`{"operatorId":"operator-bob"}`)), "payoutId", payoutID)
	completeRec2 := httptest.NewRecorder()
	HandleCompletePayoutRequest(db).ServeHTTP(completeRec2, completeReq2)
	if completeRec2.Code != http.StatusOK {
		t.Fatalf("expected a different operator to be able to complete, got %d: %s", completeRec2.Code, completeRec2.Body.String())
	}
}
