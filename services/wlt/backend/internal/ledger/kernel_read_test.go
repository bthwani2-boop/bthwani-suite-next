package ledger

import (
	"context"
	"testing"
)

func findCurrencySummary(summary *FinancialSummary, currency string) *CurrencySummary {
	for i := range summary.Currencies {
		if summary.Currencies[i].Currency == currency {
			return &summary.Currencies[i]
		}
	}
	return nil
}

func findAccountBalance(cs *CurrencySummary, accountType string) *AccountBalance {
	if cs == nil {
		return nil
	}
	for i := range cs.Accounts {
		if cs.Accounts[i].AccountType == accountType {
			return &cs.Accounts[i]
		}
	}
	return nil
}

// TestBuildFinancialSummary_NormalBalanceSideMatchesRealWalletDirection posts
// the exact same line shape internal/cod uses for commission_earned (debit
// platform_commission_receivable, credit wallet) and commission_reversed
// (debit wallet, credit platform_commission_receivable), then asserts the
// summary's signed balances move in the direction a human accountant (and a
// wallet-balance reader) would expect: a wallet credit from an earned
// commission increases the wallet's liability balance, not decreases it.
// This is the regression test that would fail if BuildFinancialSummary ever
// started reading the blanket-rule balance_minor_units column instead of
// deriving signs from each account type's normal balance side.
func TestBuildFinancialSummary_NormalBalanceSideMatchesRealWalletDirection(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := context.Background()
	actorID := uniqueActorID("field-agent")
	currency := "TST"

	before, err := BuildFinancialSummary(ctx, db)
	if err != nil {
		t.Fatalf("BuildFinancialSummary (before): %v", err)
	}
	walletBefore := findAccountBalance(findCurrencySummary(before, currency), "wallet")
	receivableBefore := findAccountBalance(findCurrencySummary(before, currency), "platform_commission_receivable")
	var walletBeforeBalance, receivableBeforeBalance int64
	if walletBefore != nil {
		walletBeforeBalance = walletBefore.BalanceMinorUnits
	}
	if receivableBefore != nil {
		receivableBeforeBalance = receivableBefore.BalanceMinorUnits
	}

	postCommissionLine := func(transactionType string, walletSide, receivableSide string, amount int64) {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("begin tx: %v", err)
		}
		defer tx.Rollback()
		lines := []LedgerLine{
			{AccountType: "platform_commission_receivable", DebitCredit: receivableSide, AmountMinorUnits: amount, Currency: currency},
			{AccountType: "wallet", ActorType: "captain", ActorID: actorID, DebitCredit: walletSide, AmountMinorUnits: amount, Currency: currency},
		}
		if _, err := PostLedgerTransaction(ctx, tx, transactionType, "test", actorID, lines, Actor{ID: "system", Type: "system"}); err != nil {
			t.Fatalf("post %s: %v", transactionType, err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit %s: %v", transactionType, err)
		}
	}

	// commission_earned: debit receivable, credit wallet (matches internal/cod.go).
	postCommissionLine("commission_earned", "credit", "debit", 5000)
	// commission_reversed: debit wallet, credit receivable (matches internal/cod.go).
	postCommissionLine("commission_reversed", "debit", "credit", 2000)

	after, err := BuildFinancialSummary(ctx, db)
	if err != nil {
		t.Fatalf("BuildFinancialSummary (after): %v", err)
	}
	walletAfter := findAccountBalance(findCurrencySummary(after, currency), "wallet")
	receivableAfter := findAccountBalance(findCurrencySummary(after, currency), "platform_commission_receivable")
	if walletAfter == nil {
		t.Fatalf("expected a %s wallet account balance after posting", currency)
	}
	if receivableAfter == nil {
		t.Fatalf("expected a %s platform_commission_receivable account balance after posting", currency)
	}

	walletDelta := walletAfter.BalanceMinorUnits - walletBeforeBalance
	receivableDelta := receivableAfter.BalanceMinorUnits - receivableBeforeBalance

	// Net effect: wallet credited 5000 then debited 2000 -> +3000 (credit is
	// wallet's normal/increasing side, since wallet is a liability account).
	if walletDelta != 3000 {
		t.Fatalf("expected wallet balance to move by +3000 (commission earned net of reversal), got %+d", walletDelta)
	}
	// Net effect: receivable debited 5000 then credited 2000 -> +3000 (debit
	// is the asset account's normal/increasing side).
	if receivableDelta != 3000 {
		t.Fatalf("expected platform_commission_receivable balance to move by +3000, got %+d", receivableDelta)
	}

	if walletAfter.Category != "liability" || walletAfter.NormalBalanceSide != "credit" {
		t.Fatalf("expected wallet account metadata {liability, credit}, got {%s, %s}", walletAfter.Category, walletAfter.NormalBalanceSide)
	}
	if receivableAfter.Category != "asset" || receivableAfter.NormalBalanceSide != "debit" {
		t.Fatalf("expected platform_commission_receivable metadata {asset, debit}, got {%s, %s}", receivableAfter.Category, receivableAfter.NormalBalanceSide)
	}
}
