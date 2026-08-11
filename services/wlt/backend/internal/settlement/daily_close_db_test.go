package settlement

import (
	"strings"
	"testing"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

// TestDailyCloseTotalsComeFromTheCanonicalLedger proves the close reads the
// double-entry kernel.
//
// The totals previously came from wlt_ledger_entries, a retired compatibility
// table that no current write path fills, so every close persisted
// total_payouts=0 and total_cashin=0 into wlt_daily_finance_close while
// presenting them as the day's signed financial position.
func TestDailyCloseTotalsComeFromTheCanonicalLedger(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := testsupport.UniqueID("ctx-close")
	actorID := testsupport.UniqueID("captain-close")
	businessDate := time.Now().UTC().Format("2006-01-02")
	ctx := shared.WithOperatorContext(t.Context(), operatorContextID)

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_daily_finance_close WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM wlt_ledger_lines WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM wlt_ledger_transactions WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM wlt_ledger_accounts WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM wlt_finance_audit_events WHERE operator_context_id=$1`, operatorContextID)
	})

	const topUpAmount int64 = 7000
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.PostLedgerTransaction(ctx, tx, "cash_in_topup", "payment_session",
		testsupport.UniqueID("ps-close"), []ledger.LedgerLine{
			{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: topUpAmount, Currency: "YER"},
			{AccountType: "wallet", ActorType: "captain", ActorID: actorID, DebitCredit: "credit", AmountMinorUnits: topUpAmount, Currency: "YER"},
		}, ledger.Actor{ID: "system", Type: "system"}); err != nil {
		_ = tx.Rollback()
		t.Fatalf("post cash-in: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	close, err := ExecuteDailyFinanceClose(ctx, db, ExecuteDailyCloseInput{
		BusinessDate: businessDate,
		OperatorID:   "finance-day-closer",
	}, "close-corr")
	if err != nil {
		t.Fatalf("execute daily close: %v", err)
	}
	if close.TotalCashinMinorUnits != topUpAmount {
		t.Fatalf("total cash-in = %d, want %d (the close is not reading the canonical ledger)",
			close.TotalCashinMinorUnits, topUpAmount)
	}
	if close.ClosingBalanceMinorUnits != topUpAmount {
		t.Fatalf("closing balance = %d, want %d", close.ClosingBalanceMinorUnits, topUpAmount)
	}

	// A business date closes exactly once.
	if _, err := ExecuteDailyFinanceClose(ctx, db, ExecuteDailyCloseInput{
		BusinessDate: businessDate,
		OperatorID:   "finance-day-closer",
	}, "close-corr-2"); err == nil {
		t.Fatal("expected a second close of the same business date to be refused")
	}
}

// TestDailyCloseBlocksOnUnverifiedExecution proves the independent-verification
// gate can actually fire. Its previous predicate was
// verified_by_operator_id = '', but the only write path stamped that column
// with the submitter at insert time, so no row could ever match and the gate
// was structurally inert.
func TestDailyCloseBlocksOnUnverifiedExecution(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := testsupport.UniqueID("ctx-close-block")
	ctx := shared.WithOperatorContext(t.Context(), operatorContextID)

	var batchID string
	if err := db.QueryRow(`INSERT INTO wlt_settlement_batches
		(operator_context_id, provider_id, currency, batch_hash, control_total_minor_units, row_count, created_by_operator_id, status, frozen_at)
		VALUES ($1, 'test-provider', 'YER', $2, 5000, 1, 'finance-maker', 'awaiting_verification', now())
		RETURNING id`, operatorContextID, testsupport.UniqueID("hash")).Scan(&batchID); err != nil {
		t.Fatalf("seed batch: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_manual_transfer_evidence WHERE batch_id=$1`, batchID)
		_, _ = db.Exec(`DELETE FROM wlt_settlement_batches WHERE id=$1`, batchID)
		_, _ = db.Exec(`DELETE FROM wlt_daily_finance_close WHERE operator_context_id=$1`, operatorContextID)
	})

	// Evidence recorded by an executor, awaiting an independent verifier.
	if _, err := db.Exec(`INSERT INTO wlt_manual_transfer_evidence
		(operator_context_id, batch_id, approved_snapshot_id, external_transfer_reference,
		 amount_minor_units, currency, executed_by_operator_id)
		SELECT $1, $2, s.id, $3, 5000, 'YER', 'finance-executor'
		FROM wlt_approved_payout_snapshots s LIMIT 1`,
		operatorContextID, batchID, testsupport.UniqueID("ref")); err != nil {
		t.Skipf("no approved payout snapshot available to attach evidence to: %v", err)
	}

	// The batch row count is 1 and it has evidence, so the completeness gate
	// passes; the verification gate must be the one that blocks.
	if _, err := db.Exec(`INSERT INTO wlt_settlement_batch_rows (batch_id, approved_snapshot_id)
		SELECT $1, approved_snapshot_id FROM wlt_manual_transfer_evidence WHERE batch_id = $1`, batchID); err != nil {
		t.Fatalf("seed batch row: %v", err)
	}

	_, err := ExecuteDailyFinanceClose(ctx, db, ExecuteDailyCloseInput{
		BusinessDate: time.Now().UTC().Format("2006-01-02"),
		OperatorID:   "finance-day-closer",
	}, "close-block-corr")
	if err == nil {
		t.Fatal("expected the close to be blocked by unverified external execution")
	}
	if !strings.Contains(err.Error(), "not independently verified") {
		t.Fatalf("expected the verification gate to block, got: %v", err)
	}
}
