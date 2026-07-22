package refund

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/dshoutbox"
	"wlt-api/internal/provider"
)

type governedRuntimeProvider struct {
	result   provider.ProviderResult
	err      error
	calls    int
	lastPath string
	lastMeta provider.RequestMeta
}

func (p *governedRuntimeProvider) Post(_ context.Context, path string, _ any, meta provider.RequestMeta) (provider.ProviderResult, error) {
	p.calls++
	p.lastPath = path
	p.lastMeta = meta
	return p.result, p.err
}

func createGovernedRuntimeRefund(t *testing.T, db *sql.DB, sessionID, orderID string, amount int64, suffix string) *GovernedRefund {
	t.Helper()
	var tenantID, clientID string
	if err := db.QueryRow(`SELECT tenant_id, client_id FROM wlt_payment_sessions WHERE id=$1`, sessionID).Scan(&tenantID, &clientID); err != nil {
		t.Fatalf("read runtime payment session identity: %v", err)
	}
	key := fmt.Sprintf("jrn035-runtime-%s-%d", suffix, time.Now().UnixNano())
	created, replayed, err := CreateGovernedRefund(context.Background(), db, GovernedCreateRefundInput{
		TenantID:              tenantID,
		PaymentSessionID:      sessionID,
		OrderID:               orderID,
		ClientID:              clientID,
		AmountMinorUnits:      amount,
		Reason:                "JRN-035 runtime evidence " + suffix,
		EligibilityReference: "runtime-evidence:" + suffix,
		RequestedByOperatorID: "maker-" + suffix,
		IdempotencyKey:        key,
		CorrelationID:         "corr-create-" + suffix,
	})
	if err != nil {
		t.Fatalf("create governed runtime refund: %v", err)
	}
	if replayed {
		t.Fatal("new runtime refund unexpectedly reported as replayed")
	}
	approved, err := ApproveGovernedRefund(context.Background(), db, created.ID, RefundDecisionInput{
		OperatorID:    "checker-" + suffix,
		Reason:        "independent runtime approval",
		CorrelationID: "corr-approve-" + suffix,
	})
	if err != nil {
		t.Fatalf("approve governed runtime refund: %v", err)
	}
	if approved.Status != "approved" {
		t.Fatalf("expected approved status, got %q", approved.Status)
	}
	return approved
}

func assertRuntimeFinancialArtifacts(t *testing.T, db *sql.DB, refundID string, expectedAmount int64, expectedCount int) {
	t.Helper()
	var transactionCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM wlt_ledger_transactions
		WHERE transaction_type='refund_completed' AND reference_type='refund' AND reference_id=$1`, refundID).Scan(&transactionCount); err != nil {
		t.Fatalf("count refund ledger transactions: %v", err)
	}
	if transactionCount != expectedCount {
		t.Fatalf("expected %d refund ledger transaction(s), got %d", expectedCount, transactionCount)
	}
	var outboxCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM wlt_dsh_outbox_events
		WHERE refund_reference=$1 AND event_type='refunded'`, refundID).Scan(&outboxCount); err != nil {
		t.Fatalf("count refund outbox events: %v", err)
	}
	if outboxCount != expectedCount {
		t.Fatalf("expected %d refund outbox event(s), got %d", expectedCount, outboxCount)
	}
	if expectedCount == 0 {
		return
	}
	var debitTotal, creditTotal int64
	if err := db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN l.debit_credit='debit' THEN l.amount_minor_units ELSE 0 END),0),
			COALESCE(SUM(CASE WHEN l.debit_credit='credit' THEN l.amount_minor_units ELSE 0 END),0)
		FROM wlt_ledger_transactions t
		JOIN wlt_ledger_lines l ON l.ledger_transaction_id=t.id
		WHERE t.transaction_type='refund_completed' AND t.reference_type='refund' AND t.reference_id=$1`, refundID).Scan(&debitTotal, &creditTotal); err != nil {
		t.Fatalf("sum refund ledger lines: %v", err)
	}
	if debitTotal != expectedAmount || creditTotal != expectedAmount {
		t.Fatalf("expected balanced ledger debit=%d credit=%d, got debit=%d credit=%d", expectedAmount, expectedAmount, debitTotal, creditTotal)
	}
}

func TestGovernedRefundRuntimeProviderSuccessLedgerAndOutboxRetry(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 5000, "YER")
	orderID := fmt.Sprintf("jrn035-success-order-%d", time.Now().UnixNano())
	approved := createGovernedRuntimeRefund(t, db, sessionID, orderID, 2000, "success")
	stub := &governedRuntimeProvider{result: provider.ProviderResult{Status: "refunded", ProviderReference: "provider-success-" + approved.ID}}

	completed, err := CompleteGovernedRefundWithProvider(context.Background(), db, stub, approved.ID, "executor-success", "corr-execute-success")
	if err != nil {
		t.Fatalf("complete provider-confirmed refund: %v", err)
	}
	if completed.Status != "completed" || completed.ProviderStatus != "refunded" {
		t.Fatalf("unexpected completed refund state: status=%q providerStatus=%q", completed.Status, completed.ProviderStatus)
	}
	if stub.calls != 1 || stub.lastPath != "/financial/card/refund" || stub.lastMeta.IdempotencyKey == "" {
		t.Fatalf("provider execution evidence invalid: calls=%d path=%q idempotency=%q", stub.calls, stub.lastPath, stub.lastMeta.IdempotencyKey)
	}
	assertRuntimeFinancialArtifacts(t, db, completed.ID, completed.AmountMinorUnits, 1)

	_, err = CompleteGovernedRefundWithProvider(context.Background(), db, stub, approved.ID, "executor-success", "corr-replay-success")
	if !errors.Is(err, ErrRefundNotInExpectedState) {
		t.Fatalf("expected completed refund replay to be blocked, got %v", err)
	}
	if stub.calls != 1 {
		t.Fatalf("provider must remain single-claim, got %d calls", stub.calls)
	}

	var eventID, status string
	var attemptCount int
	if err := db.QueryRow(`SELECT id::text,status,attempt_count FROM wlt_dsh_outbox_events WHERE refund_reference=$1 AND event_type='refunded'`, completed.ID).Scan(&eventID, &status, &attemptCount); err != nil {
		t.Fatalf("read refund outbox event: %v", err)
	}
	if status != "pending" || attemptCount != 0 {
		t.Fatalf("unexpected initial outbox state: status=%q attempts=%d", status, attemptCount)
	}
	if err := dshoutbox.MarkFailed(db, eventID, attemptCount, errors.New("simulated DSH outage")); err != nil {
		t.Fatalf("mark refund outbox failed: %v", err)
	}
	var lastError string
	if err := db.QueryRow(`SELECT status,attempt_count,COALESCE(last_error,'') FROM wlt_dsh_outbox_events WHERE id=$1::uuid`, eventID).Scan(&status, &attemptCount, &lastError); err != nil {
		t.Fatalf("read failed outbox retry state: %v", err)
	}
	if status != "pending" || attemptCount != 1 || lastError == "" {
		t.Fatalf("outbox retry evidence invalid: status=%q attempts=%d lastError=%q", status, attemptCount, lastError)
	}
	if err := dshoutbox.MarkSent(db, eventID); err != nil {
		t.Fatalf("mark refund outbox sent: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM wlt_dsh_outbox_events WHERE id=$1::uuid`, eventID).Scan(&status); err != nil {
		t.Fatalf("read sent outbox state: %v", err)
	}
	if status != "sent" {
		t.Fatalf("expected sent outbox state, got %q", status)
	}
}

func TestGovernedRefundRuntimeDefinitiveProviderFailureHasNoLedgerOrOutbox(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 3000, "YER")
	orderID := fmt.Sprintf("jrn035-failure-order-%d", time.Now().UnixNano())
	approved := createGovernedRuntimeRefund(t, db, sessionID, orderID, 700, "failure")
	stub := &governedRuntimeProvider{err: provider.Error{Code: "REFUND_DECLINED", StatusCode: 422, Message: "simulated definitive decline"}}

	_, err := CompleteGovernedRefundWithProvider(context.Background(), db, stub, approved.ID, "executor-failure", "corr-execute-failure")
	var providerErr provider.Error
	if !errors.As(err, &providerErr) {
		t.Fatalf("expected definitive provider error, got %v", err)
	}
	if errors.Is(err, ErrRefundProviderUnknown) {
		t.Fatal("definitive provider failure must not be classified as unknown")
	}
	current, err := GetGovernedRefund(db, approved.ID)
	if err != nil {
		t.Fatalf("read definitively failed refund: %v", err)
	}
	if current.Status != "rejected" || current.ProviderStatus != "failed" {
		t.Fatalf("unexpected definitive failure state: status=%q providerStatus=%q", current.Status, current.ProviderStatus)
	}
	if stub.calls != 1 {
		t.Fatalf("expected one provider call, got %d", stub.calls)
	}
	assertRuntimeFinancialArtifacts(t, db, approved.ID, approved.AmountMinorUnits, 0)
}

func TestGovernedRefundRuntimeAmbiguousResultRequiresReconciliationAndNoRetry(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 4000, "YER")
	orderID := fmt.Sprintf("jrn035-unknown-order-%d", time.Now().UnixNano())
	approved := createGovernedRuntimeRefund(t, db, sessionID, orderID, 900, "unknown")
	stub := &governedRuntimeProvider{err: errors.New("simulated provider transport timeout")}

	_, err := CompleteGovernedRefundWithProvider(context.Background(), db, stub, approved.ID, "executor-unknown", "corr-execute-unknown")
	if !errors.Is(err, ErrRefundProviderUnknown) {
		t.Fatalf("expected ErrRefundProviderUnknown, got %v", err)
	}
	unknown, err := GetGovernedRefund(db, approved.ID)
	if err != nil {
		t.Fatalf("read unknown refund: %v", err)
	}
	if unknown.Status != "provider_unknown" || unknown.ReconciliationCaseID == "" {
		t.Fatalf("unexpected unknown state: status=%q reconciliationCase=%q", unknown.Status, unknown.ReconciliationCaseID)
	}
	assertRuntimeFinancialArtifacts(t, db, approved.ID, approved.AmountMinorUnits, 0)

	_, err = CompleteGovernedRefundWithProvider(context.Background(), db, stub, approved.ID, "executor-unknown", "corr-retry-unknown")
	if !errors.Is(err, ErrRefundNotInExpectedState) {
		t.Fatalf("expected automatic provider retry to be blocked, got %v", err)
	}
	if stub.calls != 1 {
		t.Fatalf("ambiguous result must not call provider again, got %d calls", stub.calls)
	}

	completed, err := ReconcileGovernedRefund(context.Background(), db, approved.ID, RefundReconciliationInput{
		OperatorID:        "reconciler-unknown",
		ResolutionAction:  "confirmed_success",
		EvidenceNote:      "provider settlement report confirms the refund",
		ProviderReference: "provider-reconciled-" + approved.ID,
		CorrelationID:     "corr-reconcile-unknown",
	})
	if err != nil {
		t.Fatalf("reconcile ambiguous refund as success: %v", err)
	}
	if completed.Status != "completed" {
		t.Fatalf("expected reconciled refund to complete, got %q", completed.Status)
	}
	assertRuntimeFinancialArtifacts(t, db, approved.ID, approved.AmountMinorUnits, 1)
	var caseStatus, resolution string
	if err := db.QueryRow(`SELECT status,COALESCE(resolution,'') FROM wlt_reconciliation_cases WHERE id=$1`, unknown.ReconciliationCaseID).Scan(&caseStatus, &resolution); err != nil {
		t.Fatalf("read resolved reconciliation case: %v", err)
	}
	if caseStatus != "resolved" || resolution != "confirmed_success" {
		t.Fatalf("unexpected reconciliation result: status=%q resolution=%q", caseStatus, resolution)
	}
}

func TestGovernedRefundRuntimePartialThenRemainingFullPreventsOverRefund(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	sessionID := insertTestSession(t, db, "captured", 1000, "YER")
	orderID := fmt.Sprintf("jrn035-partial-order-%d", time.Now().UnixNano())
	first := createGovernedRuntimeRefund(t, db, sessionID, orderID, 400, "partial-first")
	firstProvider := &governedRuntimeProvider{result: provider.ProviderResult{Status: "refunded", ProviderReference: "provider-partial-first-" + first.ID}}
	if _, err := CompleteGovernedRefundWithProvider(context.Background(), db, firstProvider, first.ID, "executor-partial-first", "corr-partial-first"); err != nil {
		t.Fatalf("complete first partial refund: %v", err)
	}

	second := createGovernedRuntimeRefund(t, db, sessionID, orderID, 0, "partial-remaining")
	if second.AmountMinorUnits != 600 {
		t.Fatalf("expected zero amount request to reserve remaining 600, got %d", second.AmountMinorUnits)
	}
	secondProvider := &governedRuntimeProvider{result: provider.ProviderResult{Status: "refunded", ProviderReference: "provider-partial-remaining-" + second.ID}}
	if _, err := CompleteGovernedRefundWithProvider(context.Background(), db, secondProvider, second.ID, "executor-partial-remaining", "corr-partial-remaining"); err != nil {
		t.Fatalf("complete remaining refund: %v", err)
	}

	var tenantID, clientID string
	if err := db.QueryRow(`SELECT tenant_id,client_id FROM wlt_payment_sessions WHERE id=$1`, sessionID).Scan(&tenantID, &clientID); err != nil {
		t.Fatalf("read completed session identity: %v", err)
	}
	_, _, err := CreateGovernedRefund(context.Background(), db, GovernedCreateRefundInput{
		TenantID: tenantID, PaymentSessionID: sessionID, OrderID: orderID, ClientID: clientID,
		AmountMinorUnits: 1, Reason: "over refund", EligibilityReference: "runtime-over-refund",
		RequestedByOperatorID: "maker-over-refund", IdempotencyKey: fmt.Sprintf("over-refund-%d", time.Now().UnixNano()),
	})
	if !errors.Is(err, ErrRefundAmountUnavailable) {
		t.Fatalf("expected over-refund prevention, got %v", err)
	}
	var completedTotal int64
	if err := db.QueryRow(`SELECT COALESCE(SUM(amount_minor_units),0) FROM wlt_refunds WHERE payment_session_id=$1 AND status='completed'`, sessionID).Scan(&completedTotal); err != nil {
		t.Fatalf("sum completed partial refunds: %v", err)
	}
	if completedTotal != 1000 {
		t.Fatalf("expected completed refund total 1000, got %d", completedTotal)
	}
	assertRuntimeFinancialArtifacts(t, db, first.ID, first.AmountMinorUnits, 1)
	assertRuntimeFinancialArtifacts(t, db, second.ID, second.AmountMinorUnits, 1)
}
