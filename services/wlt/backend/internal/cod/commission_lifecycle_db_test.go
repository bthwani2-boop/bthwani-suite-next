package cod

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/shared"
	"wlt-api/internal/wallet"
)

type governedCommissionFixture struct {
	ctx      context.Context
	operatorContextID string
	actorID  string
	item     *Commission
}

func createGovernedCommissionLifecycleFixture(t *testing.T, db *sql.DB) governedCommissionFixture {
	t.Helper()
	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContextID := "OperatorContext-commission-lifecycle-" + suffix
	actorID := "field-actor-" + suffix
	visitID := "visit-" + suffix
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	maximum := int64(1000)

	_, err := UpsertGovernedCommissionPolicyIdempotent(
		ctx,
		db,
		UpsertGovernedCommissionPolicyInput{
			PolicyID:                "field-visit-policy-" + suffix,
			CommissionType:          "field_visit_fee",
			SourceType:              "field_visit",
			BeneficiaryActorType:    "field",
			CalculationType:         "fixed",
			FixedAmountMinorUnits:   1000,
			MinimumAmountMinorUnits: 1000,
			MaximumAmountMinorUnits: &maximum,
			Currency:                "YER",
			Status:                  "active",
			ChangeReason:            "OperatorContext-governed commission lifecycle test",
			OperatorID:              "operator-test",
		},
		"policy-correlation-"+suffix,
		"policy-idempotency-"+suffix,
	)
	if err != nil {
		t.Fatalf("create governed commission policy: %v", err)
	}

	commission, err := CreateGovernedCommission(
		ctx,
		db,
		CreateGovernedCommissionInput{
			BeneficiaryActorID:   actorID,
			BeneficiaryActorType: "field",
			SourceType:           "field_visit",
			SourceID:             visitID,
			VisitID:              &visitID,
			CommissionType:       "field_visit_fee",
			SourceEvidenceID:     visitID,
			SourceEvidenceHash:   "evidence-" + suffix,
			SourceEvidenceStatus: "completed",
			Currency:             "YER",
			IdempotencyKey:       "commission-idempotency-" + suffix,
		},
		"commission-correlation-"+suffix,
	)
	if err != nil {
		t.Fatalf("create governed field-visit commission: %v", err)
	}
	if commission == nil || commission.Status != "pending" {
		t.Fatalf("expected pending governed commission, got %+v", commission)
	}
	return governedCommissionFixture{ctx: ctx, operatorContextID: operatorContextID, actorID: actorID, item: commission}
}

func TestGovernedCommissionLifecycleConfirmSettleMovesOperatorContextWalletBuckets(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	fixture := createGovernedCommissionLifecycleFixture(t, db)

	confirmed, err := ConfirmGovernedCommission(
		fixture.ctx,
		db,
		fixture.item.ID,
		"operator-confirm",
		"confirm-"+fixture.item.ID,
	)
	if err != nil {
		t.Fatalf("confirm governed commission: %v", err)
	}
	if confirmed.Status != "confirmed" {
		t.Fatalf("expected confirmed status, got %q", confirmed.Status)
	}

	before, err := wallet.GetWalletForOperatorContext(db, fixture.operatorContextID, "field", fixture.actorID)
	if err != nil {
		t.Fatalf("read OperatorContext wallet before settle: %v", err)
	}
	if before == nil || before.PendingBalanceMinorUnits != fixture.item.AmountMinorUnits {
		t.Fatalf("unexpected OperatorContext wallet before settle: %+v", before)
	}

	settled, err := SettleGovernedCommission(
		fixture.ctx,
		db,
		fixture.item.ID,
		"operator-settle",
		"settle-"+fixture.item.ID,
	)
	if err != nil {
		t.Fatalf("settle governed commission: %v", err)
	}
	if settled.Status != "settled" {
		t.Fatalf("expected settled status, got %q", settled.Status)
	}

	after, err := wallet.GetWalletForOperatorContext(db, fixture.operatorContextID, "field", fixture.actorID)
	if err != nil {
		t.Fatalf("read OperatorContext wallet after settle: %v", err)
	}
	if after.PendingBalanceMinorUnits != 0 ||
		after.AvailableBalanceMinorUnits != fixture.item.AmountMinorUnits ||
		after.SettledTotalMinorUnits != fixture.item.AmountMinorUnits {
		t.Fatalf("unexpected OperatorContext wallet after settle: %+v", after)
	}
}

func TestGovernedCommissionLifecycleSettleRequiresConfirmedFirst(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	fixture := createGovernedCommissionLifecycleFixture(t, db)

	if _, err := SettleGovernedCommission(
		fixture.ctx,
		db,
		fixture.item.ID,
		"operator-settle",
		"settle-before-confirm-"+fixture.item.ID,
	); err != ErrCommissionNotInExpectedState {
		t.Fatalf("expected ErrCommissionNotInExpectedState, got %v", err)
	}
}

func TestGovernedCommissionLifecycleRejectReversesOperatorContextWalletAndLedger(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	fixture := createGovernedCommissionLifecycleFixture(t, db)

	rejected, err := RejectGovernedCommission(
		fixture.ctx,
		db,
		fixture.item.ID,
		"operator-reject",
		"duplicate visit",
		"reject-"+fixture.item.ID,
	)
	if err != nil {
		t.Fatalf("reject governed commission: %v", err)
	}
	if rejected.Status != "rejected" || rejected.ResolutionNote != "duplicate visit" {
		t.Fatalf("unexpected rejected commission: %+v", rejected)
	}

	after, err := wallet.GetWalletForOperatorContext(db, fixture.operatorContextID, "field", fixture.actorID)
	if err != nil {
		t.Fatalf("read OperatorContext wallet after reject: %v", err)
	}
	if after.PendingBalanceMinorUnits != 0 || after.EarnedTotalMinorUnits != 0 {
		t.Fatalf("OperatorContext wallet was not reversed: %+v", after)
	}

	var ledgerTxnCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_ledger_transactions
		WHERE operator_context_id=$1 AND reference_type='commission' AND reference_id=$2`,
		fixture.operatorContextID, fixture.item.ID).Scan(&ledgerTxnCount); err != nil {
		t.Fatalf("count OperatorContext commission ledger transactions: %v", err)
	}
	if ledgerTxnCount != 2 {
		t.Fatalf("expected earn and rejection journal entries, got %d", ledgerTxnCount)
	}
}

func TestGovernedCommissionLifecycleReverseAfterSettled(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	fixture := createGovernedCommissionLifecycleFixture(t, db)

	if _, err := ConfirmGovernedCommission(
		fixture.ctx, db, fixture.item.ID, "operator-confirm", "confirm-"+fixture.item.ID,
	); err != nil {
		t.Fatalf("confirm governed commission: %v", err)
	}
	if _, err := SettleGovernedCommission(
		fixture.ctx, db, fixture.item.ID, "operator-settle", "settle-"+fixture.item.ID,
	); err != nil {
		t.Fatalf("settle governed commission: %v", err)
	}

	reversed, err := ReverseGovernedCommission(
		fixture.ctx,
		db,
		fixture.item.ID,
		"operator-reverse",
		"fraud confirmed after settlement",
		"reverse-"+fixture.item.ID,
	)
	if err != nil {
		t.Fatalf("reverse governed commission: %v", err)
	}
	if reversed.Status != "reversed" {
		t.Fatalf("expected reversed status, got %q", reversed.Status)
	}

	after, err := wallet.GetWalletForOperatorContext(db, fixture.operatorContextID, "field", fixture.actorID)
	if err != nil {
		t.Fatalf("read OperatorContext wallet after reverse: %v", err)
	}
	if after.AvailableBalanceMinorUnits != 0 || after.SettledTotalMinorUnits != 0 {
		t.Fatalf("OperatorContext wallet was not reversed: %+v", after)
	}

	if _, err := ReverseGovernedCommission(
		fixture.ctx,
		db,
		fixture.item.ID,
		"operator-reverse",
		"double reverse",
		"double-reverse-"+fixture.item.ID,
	); err != ErrCommissionNotInExpectedState {
		t.Fatalf("expected ErrCommissionNotInExpectedState on double reverse, got %v", err)
	}
}
