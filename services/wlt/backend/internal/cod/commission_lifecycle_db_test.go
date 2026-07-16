package cod

import (
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/wallet"
)

func TestCommissionLifecycle_ConfirmSettle_MovesWalletBuckets(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())

	c, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		IdempotencyKey:       visitID,
	})
	if err != nil {
		t.Fatalf("failed to create field-visit commission: %v", err)
	}
	if c.Status != "pending" {
		t.Fatalf("expected initial status 'pending', got %q", c.Status)
	}

	confirmed, err := ConfirmCommission(db, c.ID)
	if err != nil {
		t.Fatalf("confirm failed: %v", err)
	}
	if confirmed.Status != "confirmed" {
		t.Fatalf("expected status 'confirmed', got %q", confirmed.Status)
	}

	wBefore, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}
	if wBefore.PendingBalanceMinorUnits != c.AmountMinorUnits {
		t.Fatalf("expected pending balance %d before settle, got %d", c.AmountMinorUnits, wBefore.PendingBalanceMinorUnits)
	}

	settled, err := SettleCommission(db, c.ID)
	if err != nil {
		t.Fatalf("settle failed: %v", err)
	}
	if settled.Status != "settled" {
		t.Fatalf("expected status 'settled', got %q", settled.Status)
	}

	wAfter, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}
	if wAfter.PendingBalanceMinorUnits != 0 {
		t.Fatalf("expected pending balance 0 after settle, got %d", wAfter.PendingBalanceMinorUnits)
	}
	if wAfter.AvailableBalanceMinorUnits != c.AmountMinorUnits {
		t.Fatalf("expected available balance %d after settle, got %d", c.AmountMinorUnits, wAfter.AvailableBalanceMinorUnits)
	}
	if wAfter.SettledTotalMinorUnits != c.AmountMinorUnits {
		t.Fatalf("expected settled total %d after settle, got %d", c.AmountMinorUnits, wAfter.SettledTotalMinorUnits)
	}
}

func TestCommissionLifecycle_Settle_RequiresConfirmedFirst(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())
	c, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		IdempotencyKey:       visitID,
	})
	if err != nil {
		t.Fatalf("failed to create field-visit commission: %v", err)
	}

	if _, err := SettleCommission(db, c.ID); err != ErrCommissionNotInExpectedState {
		t.Fatalf("expected ErrCommissionNotInExpectedState settling an unconfirmed commission, got %v", err)
	}
}

func TestCommissionLifecycle_Reject_ReversesWalletEffect(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())
	c, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		IdempotencyKey:       visitID,
	})
	if err != nil {
		t.Fatalf("failed to create field-visit commission: %v", err)
	}

	wBefore, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}
	if wBefore.PendingBalanceMinorUnits != c.AmountMinorUnits {
		t.Fatalf("expected pending balance %d before reject, got %d", c.AmountMinorUnits, wBefore.PendingBalanceMinorUnits)
	}

	rejected, err := RejectCommission(db, c.ID, "duplicate visit")
	if err != nil {
		t.Fatalf("reject failed: %v", err)
	}
	if rejected.Status != "rejected" {
		t.Fatalf("expected status 'rejected', got %q", rejected.Status)
	}
	if rejected.ResolutionNote != "duplicate visit" {
		t.Fatalf("expected resolutionNote 'duplicate visit', got %q", rejected.ResolutionNote)
	}

	wAfter, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}
	if wAfter.PendingBalanceMinorUnits != 0 {
		t.Fatalf("expected pending balance reversed to 0, got %d", wAfter.PendingBalanceMinorUnits)
	}
	if wAfter.EarnedTotalMinorUnits != 0 {
		t.Fatalf("expected earned total reversed to 0, got %d", wAfter.EarnedTotalMinorUnits)
	}

	var ledgerTxnCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM wlt_ledger_transactions WHERE reference_type = 'commission' AND reference_id = $1", c.ID).Scan(&ledgerTxnCount); err != nil {
		t.Fatalf("failed to count ledger transactions: %v", err)
	}
	if ledgerTxnCount != 2 {
		t.Fatalf("expected 2 ledger transactions (earn + reject reversal) for this commission, got %d", ledgerTxnCount)
	}
}

func TestCommissionLifecycle_Reverse_AfterSettled(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	fieldActorID := fmt.Sprintf("field-actor-%d", time.Now().UnixNano())
	visitID := fmt.Sprintf("visit-%d", time.Now().UnixNano())
	c, err := CreateCommission(db, CreateCommissionInput{
		BeneficiaryActorID:   fieldActorID,
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             visitID,
		VisitID:              &visitID,
		IdempotencyKey:       visitID,
	})
	if err != nil {
		t.Fatalf("failed to create field-visit commission: %v", err)
	}
	if _, err := ConfirmCommission(db, c.ID); err != nil {
		t.Fatalf("confirm failed: %v", err)
	}
	if _, err := SettleCommission(db, c.ID); err != nil {
		t.Fatalf("settle failed: %v", err)
	}

	reversed, err := ReverseCommission(db, c.ID, "found fraudulent after settlement")
	if err != nil {
		t.Fatalf("reverse failed: %v", err)
	}
	if reversed.Status != "reversed" {
		t.Fatalf("expected status 'reversed', got %q", reversed.Status)
	}

	wAfter, err := wallet.GetWallet(db, "field", fieldActorID)
	if err != nil {
		t.Fatalf("GetWallet failed: %v", err)
	}
	if wAfter.AvailableBalanceMinorUnits != 0 {
		t.Fatalf("expected available balance reversed to 0, got %d", wAfter.AvailableBalanceMinorUnits)
	}
	if wAfter.SettledTotalMinorUnits != 0 {
		t.Fatalf("expected settled total reversed to 0, got %d", wAfter.SettledTotalMinorUnits)
	}

	if _, err := ReverseCommission(db, c.ID, "double reverse"); err != ErrCommissionNotInExpectedState {
		t.Fatalf("expected ErrCommissionNotInExpectedState on double-reverse, got %v", err)
	}
}
