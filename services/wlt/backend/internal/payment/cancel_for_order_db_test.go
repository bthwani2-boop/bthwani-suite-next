package payment

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func cancellationContext(t *testing.T, db *sql.DB, sessionID string) context.Context {
	t.Helper()
	var operatorContextID string
	if err := db.QueryRow(`SELECT operator_context_id FROM wlt_payment_sessions WHERE id=$1`, sessionID).Scan(&operatorContextID); err != nil {
		t.Fatalf("read payment-session OperatorContext: %v", err)
	}
	return shared.WithOperatorContext(context.Background(), operatorContextID)
}

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
	sessionID := seedCheckoutSession(t, db, checkoutIntentID, "authorized", "", 1000, false)

	result, err := CancelOrderFinanciallyWithContext(cancellationContext(t, db, sessionID), db, GovernedOrderCancellationInput{
		PaymentSessionID: sessionID, OrderID: orderID, ClientID: "client-test", Reason: "customer requested cancellation",
	})
	if err != nil {
		t.Fatalf("CancelOrderFinanciallyWithContext returned error: %v", err)
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

func TestCancelSessionForOrder_Captured_CreatesRefund(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	orderID := fmt.Sprintf("test-order-cfo-captured-%d", time.Now().UnixNano())
	checkoutIntentID := "checkout-" + orderID
	sessionID := seedCheckoutSession(t, db, checkoutIntentID, "captured", "card-cap-cfo", 2500, true)

	result, err := CancelOrderFinanciallyWithContext(cancellationContext(t, db, sessionID), db, GovernedOrderCancellationInput{
		PaymentSessionID: sessionID, OrderID: orderID, ClientID: "client-test", Reason: "customer requested cancellation",
	})
	if err != nil {
		t.Fatalf("CancelOrderFinanciallyWithContext returned error: %v", err)
	}
	if result.Action != "refund_requested" || result.Refund == nil {
		t.Fatalf("expected requested refund, got %+v", result)
	}
	if result.Refund.Status != "requested" {
		t.Errorf("expected refund status 'requested', got %q", result.Refund.Status)
	}
	if result.Refund.AmountMinorUnits != 2500 {
		t.Errorf("expected refund amount 2500, got %d", result.Refund.AmountMinorUnits)
	}
	if result.Refund.Currency != "YER" {
		t.Errorf("expected refund currency YER, got %q", result.Refund.Currency)
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_payment_sessions WHERE id = $1`, sessionID).Scan(&status); err != nil {
		t.Fatalf("failed to query DB row: %v", err)
	}
	if status != "captured" {
		t.Errorf("expected session status to remain captured, got %q", status)
	}
}

func TestCancelSessionForOrder_AlreadyTerminal_NoAction(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	orderID := fmt.Sprintf("test-order-cfo-terminal-%d", time.Now().UnixNano())
	checkoutIntentID := "checkout-" + orderID
	sessionID := seedCheckoutSession(t, db, checkoutIntentID, "expired", "", 1000, false)

	result, err := CancelOrderFinanciallyWithContext(cancellationContext(t, db, sessionID), db, GovernedOrderCancellationInput{
		PaymentSessionID: sessionID, OrderID: orderID, ClientID: "client-test", Reason: "customer requested cancellation",
	})
	if err != nil {
		t.Fatalf("expected no error for an already-terminal session, got %v", err)
	}
	if result.Action != "none" || result.SessionStatus != "expired" {
		t.Fatalf("unexpected terminal cancellation result: %+v", result)
	}
}
