package payment

import (
	"context"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

func TestResolveReconciliationCase_CaptureConvergesCanonicalTruth(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := "OperatorContext-canonical-reconciliation-test"
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	checkoutIntentID := fmt.Sprintf("reconciliation-capture-%d", time.Now().UnixNano())
	sessionID, err := testsupport.SeedCanonicalCheckoutPaymentSession(ctx, db, testsupport.CheckoutPaymentSession{
		OperatorContextID: operatorContextID,
		CheckoutIntentID:  checkoutIntentID,
		ClientID:          "client-reconciliation",
		StoreID:           "store-reconciliation",
		PaymentMethod:     "wallet",
		Status:            "provider_result_unknown",
		ProviderReference: "provider-capture-reference",
		AmountMinorUnits:  1000,
		Currency:          "YER",
		FinancialPurpose:  string(PurposeOrderPayment),
	})
	if err != nil {
		t.Fatalf("seed canonical session: %v", err)
	}

	var caseID string
	if err := db.QueryRowContext(ctx, `
		INSERT INTO wlt_reconciliation_cases(operator_context_id,payment_session_id,operation,trigger_reason)
		VALUES ($1,$2,'capture','test ambiguous capture') RETURNING id`, operatorContextID, sessionID).Scan(&caseID); err != nil {
		t.Fatalf("insert reconciliation case: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM wlt_reconciliation_cases WHERE id=$1`, caseID)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM wlt_payment_sessions WHERE id=$1`, sessionID)
	})

	if _, err := db.ExecContext(ctx, `
		UPDATE wlt_reconciliation_cases
		SET status='resolved', resolution_action='confirmed_success'
		WHERE id=$1`, caseID); err == nil {
		t.Fatal("case-only reconciliation resolution unexpectedly succeeded")
	}

	if err := ResolveReconciliationCase(ctx, db, caseID, operatorContextID, "operator-reconciliation", "confirmed_success", "provider dashboard evidence"); err != nil {
		t.Fatalf("resolve reconciliation case: %v", err)
	}

	var status, caseStatus, ledgerID, eventStatus string
	if err := db.QueryRowContext(ctx, `SELECT status, COALESCE(capture_ledger_transaction_id,''), last_provider_status FROM wlt_payment_sessions WHERE id=$1`, sessionID).Scan(&status, &ledgerID, &eventStatus); err != nil {
		t.Fatalf("read canonical session: %v", err)
	}
	if status != "captured" || ledgerID == "" || eventStatus != "captured" {
		t.Fatalf("session truth did not converge: status=%q ledger=%q providerStatus=%q", status, ledgerID, eventStatus)
	}
	if err := db.QueryRowContext(ctx, `SELECT status FROM wlt_reconciliation_cases WHERE id=$1`, caseID).Scan(&caseStatus); err != nil {
		t.Fatalf("read reconciliation case: %v", err)
	}
	if caseStatus != "resolved" {
		t.Fatalf("case status=%q, want resolved", caseStatus)
	}

	var appliedCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_payment_provider_events WHERE provider_event_id=$1 AND processing_state='applied'`, "reconciliation:"+caseID+":confirmed_success").Scan(&appliedCount); err != nil {
		t.Fatalf("read provider event: %v", err)
	}
	if appliedCount != 1 {
		t.Fatalf("applied provider event count=%d, want 1", appliedCount)
	}
	if err := ResolveReconciliationCase(ctx, db, caseID, operatorContextID, "operator-reconciliation", "confirmed_success", "replay"); err != ErrReconciliationCaseNotOpen {
		t.Fatalf("second resolution error=%v, want ErrReconciliationCaseNotOpen", err)
	}
}
