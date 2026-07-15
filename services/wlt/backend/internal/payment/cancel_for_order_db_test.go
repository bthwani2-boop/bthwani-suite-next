package payment

import (
	"fmt"
	"testing"
	"time"
)

// TestCancelSessionForOrder_PreCapture_Expires verifies that cancelling an
// order whose session hasn't been captured yet expires the session (rather
// than creating a refund, since no funds were ever received).
func TestCancelSessionForOrder_PreCapture_Expires(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	orderID := fmt.Sprintf("test-order-cfo-precap-%d", time.Now().UnixNano())
	checkoutIntentID := "checkout-" + orderID
	var sessionID string
	err := db.QueryRow(`
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status, amount_minor_units, currency)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'authorized', 1000, 'YER')
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	result, err := CancelSessionForOrder(db, sessionID, orderID, "client-test", "customer requested cancellation")
	if err != nil {
		t.Fatalf("CancelSessionForOrder returned error: %v", err)
	}
	if result.Action != "expired" {
		t.Fatalf("expected action 'expired', got %q", result.Action)
	}
	if result.PaymentSession == nil || result.PaymentSession.Status != "expired" {
		t.Fatalf("expected paymentSession.status 'expired', got %+v", result.PaymentSession)
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}
	if status != "expired" {
		t.Errorf("expected DB status 'expired', got %q", status)
	}
}

// TestCancelSessionForOrder_Captured_CreatesRefund verifies that cancelling
// an order whose session was already captured creates a requested-status
// refund using the session's own amount, rather than expiring it (which
// would silently lose the fact that funds were captured).
func TestCancelSessionForOrder_Captured_CreatesRefund(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	orderID := fmt.Sprintf("test-order-cfo-captured-%d", time.Now().UnixNano())
	checkoutIntentID := "checkout-" + orderID
	var sessionID string
	err := db.QueryRow(`
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status, provider_reference, amount_minor_units, currency, captured_at)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'captured', 'card-cap-cfo', 2500, 'YER', NOW())
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	result, err := CancelSessionForOrder(db, sessionID, orderID, "client-test", "customer requested cancellation")
	if err != nil {
		t.Fatalf("CancelSessionForOrder returned error: %v", err)
	}
	if result.Action != "refund_requested" {
		t.Fatalf("expected action 'refund_requested', got %q", result.Action)
	}
	if result.Refund == nil {
		t.Fatalf("expected a refund to be returned")
	}
	if result.Refund.Status != "requested" {
		t.Errorf("expected refund status 'requested' (not auto-completed), got %q", result.Refund.Status)
	}
	if result.Refund.AmountMinorUnits != 2500 {
		t.Errorf("expected refund amount to match the session's own amount (2500), got %d", result.Refund.AmountMinorUnits)
	}
	if result.Refund.Currency != "YER" {
		t.Errorf("expected refund currency 'YER', got %q", result.Refund.Currency)
	}

	// Session status itself must be unaffected by requesting a refund.
	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}
	if status != "captured" {
		t.Errorf("expected session status to remain 'captured', got %q", status)
	}
}

// TestCancelSessionForOrder_AlreadyTerminal_NoAction verifies that cancelling
// an order whose session is already expired/failed is a harmless no-op, not
// an error -- a checkout cancellation racing an already-terminal session is
// normal.
func TestCancelSessionForOrder_AlreadyTerminal_NoAction(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	orderID := fmt.Sprintf("test-order-cfo-terminal-%d", time.Now().UnixNano())
	checkoutIntentID := "checkout-" + orderID
	var sessionID string
	err := db.QueryRow(`
		INSERT INTO wlt_payment_sessions (checkout_intent_id, client_id, store_id, payment_method, status, amount_minor_units, currency)
		VALUES ($1, 'client-test', 'store-test', 'official_wallet', 'expired', 1000, 'YER')
		RETURNING id`, checkoutIntentID).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert test session: %v", err)
	}

	result, err := CancelSessionForOrder(db, sessionID, orderID, "client-test", "customer requested cancellation")
	if err != nil {
		t.Fatalf("expected no error for an already-terminal session, got %v", err)
	}
	if result.Action != "none" {
		t.Fatalf("expected action 'none', got %q", result.Action)
	}
	if result.SessionStatus != "expired" {
		t.Errorf("expected sessionStatus 'expired', got %q", result.SessionStatus)
	}
}
