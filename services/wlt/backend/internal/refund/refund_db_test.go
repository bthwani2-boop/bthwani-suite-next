package refund

import (
	"database/sql"
	"errors"
	"fmt"
	"os"
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

func insertTestSession(t *testing.T, db *sql.DB, status string, amount int64, currency string) string {
	checkoutIntentID := fmt.Sprintf("test-checkout-refund-%d", time.Now().UnixNano())
	var sessionID string
	err := db.QueryRow(`
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status, provider_reference, amount_minor_units, currency, captured_at)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', $2, 'card-ref-001', $3, $4,
		        CASE WHEN $2 IN ('captured', 'cod_collected') THEN NOW() ELSE NULL END)
		RETURNING id`, checkoutIntentID, status, amount, currency).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}
	return sessionID
}

// TestCreateRefund_IgnoresCallerAmount_UsesSessionAmount verifies the
// refunded amount/currency always come from the session's own row, since
// CreateRefundInput no longer even has amount/currency fields to tamper
// with.
func TestCreateRefund_IgnoresCallerAmount_UsesSessionAmount(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 4200, "YER")
	orderID := fmt.Sprintf("order-%d", time.Now().UnixNano())

	r, err := CreateRefund(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
		Reason:           "customer requested",
	})
	if err != nil {
		t.Fatalf("expected refund creation to succeed, got error: %v", err)
	}
	if r.AmountMinorUnits != 4200 {
		t.Errorf("expected amount 4200 (from session), got %d", r.AmountMinorUnits)
	}
	if r.Currency != "YER" {
		t.Errorf("expected currency YER (from session), got %q", r.Currency)
	}
	if r.Status != "requested" {
		t.Errorf("expected status 'requested', got %q", r.Status)
	}
}

// TestCreateRefund_SessionNotCaptured_Rejected verifies a refund cannot be
// created for a session that never received funds.
func TestCreateRefund_SessionNotCaptured_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "authorized", 1000, "YER")
	orderID := fmt.Sprintf("order-%d", time.Now().UnixNano())

	_, err := CreateRefund(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
		Reason:           "customer requested",
	})
	if !errors.Is(err, ErrSessionNotRefundable) {
		t.Fatalf("expected ErrSessionNotRefundable for a non-captured session, got %v", err)
	}
}

// TestCreateRefund_CodCollected_Allowed verifies cod_collected -- the COD
// "funds received" terminal state -- is also refundable, not just card
// captures.
func TestCreateRefund_CodCollected_Allowed(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "cod_collected", 800, "YER")
	orderID := fmt.Sprintf("order-%d", time.Now().UnixNano())

	r, err := CreateRefund(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
	})
	if err != nil {
		t.Fatalf("expected refund creation to succeed for cod_collected session, got error: %v", err)
	}
	if r.AmountMinorUnits != 800 {
		t.Errorf("expected amount 800, got %d", r.AmountMinorUnits)
	}
}

// TestCreateRefund_Idempotent_SameSession_ReturnsSameRefund verifies that
// calling CreateRefund twice for the same session (e.g. a retried DSH
// request) does not create a duplicate refund row -- it returns the
// existing one.
func TestCreateRefund_Idempotent_SameSession_ReturnsSameRefund(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 1500, "YER")
	orderID := fmt.Sprintf("order-%d", time.Now().UnixNano())
	input := CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
		Reason:           "customer requested",
	}

	first, err := CreateRefund(db, input)
	if err != nil {
		t.Fatalf("first create should succeed, got error: %v", err)
	}
	second, err := CreateRefund(db, input)
	if err != nil {
		t.Fatalf("second (replayed) create should succeed, got error: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("expected replayed create to return the same refund id, got %q vs %q", second.ID, first.ID)
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_refunds WHERE payment_session_id = $1`, sessionID).Scan(&count); err != nil {
		t.Fatalf("failed to count refunds: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected exactly 1 refund row for the session, got %d", count)
	}
}

func createTestRefund(t *testing.T, db *sql.DB, sessionStatus string) *Refund {
	t.Helper()
	sessionID := insertTestSession(t, db, sessionStatus, 1000, "YER")
	orderID := fmt.Sprintf("order-%d", time.Now().UnixNano())
	r, err := CreateRefund(db, CreateRefundInput{
		PaymentSessionID: sessionID,
		OrderID:          orderID,
		ClientID:         "client-test",
		Reason:           "test",
	})
	if err != nil {
		t.Fatalf("failed to create test refund: %v", err)
	}
	return r
}

// TestCompleteRefund_WithoutApproval_Rejected verifies a refund cannot be
// completed while still 'requested' -- Complete now requires the refund to
// have gone through Approve first.
func TestCompleteRefund_WithoutApproval_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	r := createTestRefund(t, db, "captured")
	if r.Status != "requested" {
		t.Fatalf("expected new refund to start 'requested', got %q", r.Status)
	}

	_, err := CompleteRefund(db, r.ID)
	if !errors.Is(err, ErrRefundNotInExpectedState) {
		t.Fatalf("expected ErrRefundNotInExpectedState completing an unapproved refund, got %v", err)
	}
}

// TestApproveThenComplete_Succeeds verifies the correct sequence works.
func TestApproveThenComplete_Succeeds(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	r := createTestRefund(t, db, "captured")

	approved, err := ApproveRefund(db, r.ID)
	if err != nil {
		t.Fatalf("expected approve to succeed, got error: %v", err)
	}
	if approved.Status != "approved" {
		t.Fatalf("expected status 'approved', got %q", approved.Status)
	}

	completed, err := CompleteRefund(db, r.ID)
	if err != nil {
		t.Fatalf("expected complete to succeed after approval, got error: %v", err)
	}
	if completed.Status != "completed" {
		t.Fatalf("expected status 'completed', got %q", completed.Status)
	}
}

// TestCompleteRefund_ConcurrentCalls_OnlyOneSucceeds fires two concurrent
// CompleteRefund calls against the same approved refund and asserts only one
// succeeds -- the old unconditional UPDATE with no status guard would have
// let both succeed (and, via CompleteRefundWithProvider, both call the
// provider).
func TestCompleteRefund_ConcurrentCalls_OnlyOneSucceeds(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	r := createTestRefund(t, db, "captured")
	if _, err := ApproveRefund(db, r.ID); err != nil {
		t.Fatalf("failed to approve test refund: %v", err)
	}

	type result struct {
		err error
	}
	results := make(chan result, 2)
	for i := 0; i < 2; i++ {
		go func() {
			_, err := CompleteRefund(db, r.ID)
			results <- result{err: err}
		}()
	}

	successCount := 0
	conflictCount := 0
	for i := 0; i < 2; i++ {
		res := <-results
		if res.err == nil {
			successCount++
		} else if errors.Is(res.err, ErrRefundNotInExpectedState) {
			conflictCount++
		} else {
			t.Fatalf("unexpected error: %v", res.err)
		}
	}
	if successCount != 1 || conflictCount != 1 {
		t.Fatalf("expected exactly 1 success and 1 conflict, got %d successes and %d conflicts", successCount, conflictCount)
	}
}

// TestApproveThenComplete_PostsBalancedLedgerTransaction verifies that
// completing a refund posts a balanced ledger transaction referencing the
// refund, not just a status flip.
func TestApproveThenComplete_PostsBalancedLedgerTransaction(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	r := createTestRefund(t, db, "captured")
	if _, err := ApproveRefund(db, r.ID); err != nil {
		t.Fatalf("failed to approve test refund: %v", err)
	}
	completed, err := CompleteRefund(db, r.ID)
	if err != nil {
		t.Fatalf("failed to complete test refund: %v", err)
	}

	var txnID string
	if err := db.QueryRow("SELECT id FROM wlt_ledger_transactions WHERE reference_type = 'refund' AND reference_id = $1", r.ID).Scan(&txnID); err != nil {
		t.Fatalf("expected a ledger transaction referencing this refund: %v", err)
	}

	var debitTotal, creditTotal int64
	if err := db.QueryRow("SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1 AND debit_credit = 'debit'", txnID).Scan(&debitTotal); err != nil {
		t.Fatalf("failed to sum debit lines: %v", err)
	}
	if err := db.QueryRow("SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1 AND debit_credit = 'credit'", txnID).Scan(&creditTotal); err != nil {
		t.Fatalf("failed to sum credit lines: %v", err)
	}
	if debitTotal != completed.AmountMinorUnits || creditTotal != completed.AmountMinorUnits {
		t.Fatalf("expected balanced %d/%d debit/credit, got debit=%d credit=%d", completed.AmountMinorUnits, completed.AmountMinorUnits, debitTotal, creditTotal)
	}
}

// TestRejectRefund_AfterCompleted_Rejected verifies a completed refund
// cannot be rejected after the fact.
func TestRejectRefund_AfterCompleted_Rejected(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	r := createTestRefund(t, db, "captured")
	if _, err := ApproveRefund(db, r.ID); err != nil {
		t.Fatalf("failed to approve test refund: %v", err)
	}
	if _, err := CompleteRefund(db, r.ID); err != nil {
		t.Fatalf("failed to complete test refund: %v", err)
	}

	_, err := RejectRefund(db, r.ID)
	if !errors.Is(err, ErrRefundNotInExpectedState) {
		t.Fatalf("expected ErrRefundNotInExpectedState rejecting a completed refund, got %v", err)
	}
}
