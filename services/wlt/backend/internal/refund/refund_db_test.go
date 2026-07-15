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
