package ledger

import (
	"context"
	"testing"

	"wlt-api/internal/shared"
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

func TestBuildFinancialSummary_NormalBalanceSideMatchesRealWalletDirection(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := trustedLedgerTestContext()
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

	postCommissionLine("commission_earned", "credit", "debit", 5000)
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
	if walletDelta != 3000 {
		t.Fatalf("expected wallet balance to move by +3000, got %+d", walletDelta)
	}
	if receivableDelta != 3000 {
		t.Fatalf("expected platform_commission_receivable balance to move by +3000, got %+d", receivableDelta)
	}
	if walletAfter.Category != "liability" || walletAfter.NormalBalanceSide != "credit" {
		t.Fatalf("expected wallet account metadata {liability, credit}, got {%s, %s}", walletAfter.Category, walletAfter.NormalBalanceSide)
	}
	if receivableAfter.Category != "asset" || receivableAfter.NormalBalanceSide != "debit" {
		t.Fatalf("expected platform_commission_receivable account metadata {asset, debit}, got {%s, %s}", receivableAfter.Category, receivableAfter.NormalBalanceSide)
	}
}

func TestBuildFinancialSummary_IsolatesOperatorContexts(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	contextAID := uniqueActorID("summary-context-a")
	contextBID := uniqueActorID("summary-context-b")
	ctxA := shared.WithOperatorContext(context.Background(), contextAID)
	ctxB := shared.WithOperatorContext(context.Background(), contextBID)
	currency := "ISO"
	actorID := uniqueActorID("captain")

	post := func(ctx context.Context, reference string, amount int64) {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("begin tx: %v", err)
		}
		defer tx.Rollback()
		if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, currency, amount, reference, Actor{ID: "system", Type: "system"}); err != nil {
			t.Fatalf("post opening balance: %v", err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit opening balance: %v", err)
		}
	}
	post(ctxA, uniqueActorID("summary-a"), 1100)
	post(ctxB, uniqueActorID("summary-b"), 9900)

	summaryA, err := BuildFinancialSummary(ctxA, db)
	if err != nil {
		t.Fatalf("BuildFinancialSummary A: %v", err)
	}
	walletA := findAccountBalance(findCurrencySummary(summaryA, currency), "wallet")
	if walletA == nil || walletA.BalanceMinorUnits != 1100 {
		t.Fatalf("expected context A wallet balance 1100 without context B contamination, got %+v", walletA)
	}

	summaryB, err := BuildFinancialSummary(ctxB, db)
	if err != nil {
		t.Fatalf("BuildFinancialSummary B: %v", err)
	}
	walletB := findAccountBalance(findCurrencySummary(summaryB, currency), "wallet")
	if walletB == nil || walletB.BalanceMinorUnits != 9900 {
		t.Fatalf("expected context B wallet balance 9900 without context A contamination, got %+v", walletB)
	}
}
