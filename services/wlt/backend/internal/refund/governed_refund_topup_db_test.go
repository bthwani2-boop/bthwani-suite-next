package refund

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

// insertCapturedTopUpSessionForRefund seeds a captured Cash-In wallet top-up
// session exactly like production creates them (topup_reference +
// topup_actor_type source identity, card rail, financial purpose
// customer_topup) so the refund runtime can be proven against the topup
// funding path that capture credits to the wallet.
func insertCapturedTopUpSessionForRefund(t *testing.T, db *sql.DB, actorType, actorID string, amount int64) (sessionID, operatorContextID string) {
	t.Helper()
	purpose := "customer_topup"
	if actorType == "captain" {
		purpose = "captain_topup"
	}
	operatorContextID = fmt.Sprintf("op-topup-refund-%d", time.Now().UnixNano())
	topupRef := fmt.Sprintf("topup-refund-%d", time.Now().UnixNano())
	now := time.Now().UTC()
	err := db.QueryRowContext(context.Background(), `
                INSERT INTO wlt_payment_sessions
                        (topup_reference, topup_actor_type, operator_context_id, client_id, store_id,
                         payment_method, status, provider_reference, amount_minor_units, currency,
                         captured_at, financial_purpose)
                VALUES ($1, $2, $3, $4, $4, 'official_wallet', 'captured', $5, $6, 'YER', $7, $8)
                RETURNING id`,
		topupRef, actorType, operatorContextID, actorID, "card-topup-ref-001", amount, now, purpose,
	).Scan(&sessionID)
	if err != nil {
		t.Fatalf("failed to insert captured top-up session: %v", err)
	}
	return sessionID, operatorContextID
}

// TestGovernedRefundTopUpCompletionDebitsWalletBack proves the D1 root fix
// end to end at the runtime boundary: completing a governed refund of a
// captured wallet top-up must post a journal that debits the actor's wallet
// and credits provider_clearing — the exact mirror of the capture — instead
// of the old platform_payable/provider_clearing posting that left the wallet
// credited while the card charge was returned (money creation).
func TestGovernedRefundTopUpCompletionDebitsWalletBack(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID, operatorContextID := insertCapturedTopUpSessionForRefund(t, db, "customer", "topup-client-1", 5000)
	orderID := fmt.Sprintf("topup-refund-proof-%d", time.Now().UnixNano())
	created, replayed, err := CreateGovernedRefund(
		shared.WithOperatorContext(context.Background(), operatorContextID),
		db,
		GovernedCreateRefundInput{
			OperatorContextID:     operatorContextID,
			PaymentSessionID:      sessionID,
			OrderID:               orderID,
			ClientID:              "topup-client-1",
			AmountMinorUnits:      5000,
			Reason:                "topup refund runtime proof",
			EligibilityReference:  "runtime-evidence:topup",
			RequestedByOperatorID: "maker-topup",
			IdempotencyKey:        fmt.Sprintf("topup-refund-%d", time.Now().UnixNano()),
			CorrelationID:         "corr-topup-create",
		},
	)
	if err != nil {
		t.Fatalf("create governed top-up refund: %v", err)
	}
	if replayed {
		t.Fatal("new top-up refund unexpectedly reported as replayed")
	}
	if _, err := ApproveGovernedRefund(context.Background(), db, created.ID, RefundDecisionInput{
		OperatorID:    "checker-topup",
		Reason:        "independent top-up approval",
		CorrelationID: "corr-topup-approve",
	}); err != nil {
		t.Fatalf("approve governed top-up refund: %v", err)
	}

	stub := &governedRuntimeProvider{result: provider.ProviderResult{Status: "refunded", ProviderReference: "provider-topup-refund-" + created.ID}}
	completed, err := CompleteGovernedRefundWithProvider(context.Background(), db, stub, created.ID, "executor-topup", "corr-topup-execute")
	if err != nil {
		t.Fatalf("complete governed top-up refund: %v", err)
	}
	if completed.Status != "completed" {
		t.Fatalf("expected completed status, got %q", completed.Status)
	}

	var walletDebit, providerCredit, platformDebit int64
	err = db.QueryRow(`
                SELECT
                        COALESCE(SUM(CASE WHEN a.account_type='wallet' AND l.debit_credit='debit' AND a.actor_type='client' AND a.actor_id='topup-client-1' THEN l.amount_minor_units ELSE 0 END),0),
                        COALESCE(SUM(CASE WHEN a.account_type='provider_clearing' AND l.debit_credit='credit' THEN l.amount_minor_units ELSE 0 END),0),
                        COALESCE(SUM(CASE WHEN a.account_type='platform_payable' AND l.debit_credit='debit' THEN l.amount_minor_units ELSE 0 END),0)
                FROM wlt_ledger_transactions t
                JOIN wlt_ledger_lines l ON l.ledger_transaction_id=t.id
                JOIN wlt_ledger_accounts a ON a.id=l.account_id
                WHERE t.transaction_type='refund_completed' AND t.reference_type='refund' AND t.reference_id=$1`, completed.ID,
	).Scan(&walletDebit, &providerCredit, &platformDebit)
	if err != nil {
		t.Fatalf("read top-up refund ledger lines: %v", err)
	}
	if walletDebit != 5000 || providerCredit != 5000 {
		t.Fatalf("top-up refund must debit the client wallet and credit provider_clearing by the refunded amount, got walletDebit=%d providerCredit=%d", walletDebit, providerCredit)
	}
	if platformDebit != 0 {
		t.Fatalf("top-up refund must never touch platform_payable, got platformDebit=%d", platformDebit)
	}
}

// TestGovernedRefundOrderPaymentStillPostsPlatformPayable proves the
// order-payment refund posting (the previously correct branch) is preserved
// by the purpose-derived interpretation.
func TestGovernedRefundOrderPaymentStillPostsPlatformPayable(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 5000, "YER")
	created, _, err := CreateGovernedRefund(
		shared.WithOperatorContext(context.Background(), "OperatorContext-test"),
		db,
		GovernedCreateRefundInput{
			OperatorContextID:     "OperatorContext-test",
			PaymentSessionID:      sessionID,
			OrderID:               "order-payment-proof",
			ClientID:              "client-test",
			AmountMinorUnits:      2000,
			Reason:                "order payment refund proof",
			EligibilityReference:  "runtime-evidence:order",
			RequestedByOperatorID: "maker-order",
			IdempotencyKey:        fmt.Sprintf("order-refund-%d", time.Now().UnixNano()),
			CorrelationID:         "corr-order-create",
		},
	)
	if err != nil {
		t.Fatalf("create governed order refund: %v", err)
	}
	if _, err := ApproveGovernedRefund(context.Background(), db, created.ID, RefundDecisionInput{
		OperatorID:    "checker-order",
		Reason:        "independent order approval",
		CorrelationID: "corr-order-approve",
	}); err != nil {
		t.Fatalf("approve governed order refund: %v", err)
	}

	stub := &governedRuntimeProvider{result: provider.ProviderResult{Status: "refunded", ProviderReference: "provider-order-refund-" + created.ID}}
	completed, err := CompleteGovernedRefundWithProvider(context.Background(), db, stub, created.ID, "executor-order", "corr-order-execute")
	if err != nil {
		t.Fatalf("complete governed order refund: %v", err)
	}

	var platformDebit, walletDebit int64
	err = db.QueryRow(`
                SELECT
                        COALESCE(SUM(CASE WHEN a.account_type='platform_payable' AND l.debit_credit='debit' THEN l.amount_minor_units ELSE 0 END),0),
                        COALESCE(SUM(CASE WHEN a.account_type='wallet' AND l.debit_credit='debit' THEN l.amount_minor_units ELSE 0 END),0)
                FROM wlt_ledger_transactions t
                JOIN wlt_ledger_lines l ON l.ledger_transaction_id=t.id
                JOIN wlt_ledger_accounts a ON a.id=l.account_id
                WHERE t.transaction_type='refund_completed' AND t.reference_type='refund' AND t.reference_id=$1`, completed.ID,
	).Scan(&platformDebit, &walletDebit)
	if err != nil {
		t.Fatalf("read order refund ledger lines: %v", err)
	}
	if platformDebit != 2000 || walletDebit != 0 {
		t.Fatalf("order-payment refund must debit platform_payable only, got platformDebit=%d walletDebit=%d", platformDebit, walletDebit)
	}
}
