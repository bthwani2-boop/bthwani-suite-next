package ledger

import (
	"context"
	"strings"
	"testing"

	"wlt-api/internal/shared"
)

func TestPostLedgerTransaction_RequiresTrustedOperatorContext(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()
	_, err = PostLedgerTransaction(context.Background(), tx, "OperatorContext_required", "test", uniqueActorID("ref"), []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: uniqueActorID("client"), DebitCredit: "debit", AmountMinorUnits: 100, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 100, Currency: "YER"},
	}, Actor{ID: "system", Type: "system"})
	if err == nil || !strings.Contains(err.Error(), "trusted OperatorContext context is required") {
		t.Fatalf("expected fail-closed OperatorContext error, got %v", err)
	}
}

func TestPostLedgerTransaction_IsolatesSameReferenceAndActorAcrossOperatorContexts(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	actorID := uniqueActorID("shared-client")
	referenceID := uniqueActorID("shared-reference")
	lines := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 750, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 750, Currency: "YER"},
	}

	for _, operatorContextID := range []string{"OperatorContext-a-" + referenceID, "OperatorContext-b-" + referenceID} {
		ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("begin OperatorContext %s tx: %v", operatorContextID, err)
		}
		if _, err := PostLedgerTransaction(ctx, tx, "same_reference", "test", referenceID, lines, Actor{ID: "system", Type: "system"}); err != nil {
			tx.Rollback()
			t.Fatalf("post OperatorContext %s transaction: %v", operatorContextID, err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit OperatorContext %s transaction: %v", operatorContextID, err)
		}
	}

	var transactionCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM wlt_ledger_transactions
		WHERE transaction_type='same_reference' AND reference_type='test' AND reference_id=$1`, referenceID).Scan(&transactionCount); err != nil {
		t.Fatalf("count OperatorContext transactions: %v", err)
	}
	if transactionCount != 2 {
		t.Fatalf("expected two OperatorContext-local transactions, got %d", transactionCount)
	}

	rows, err := db.Query(`
		SELECT operator_context_id, balance_minor_units
		FROM wlt_ledger_accounts
		WHERE account_type='wallet' AND actor_type='client' AND actor_id=$1 AND currency='YER'
		ORDER BY operator_context_id`, actorID)
	if err != nil {
		t.Fatalf("read OperatorContext wallets: %v", err)
	}
	defer rows.Close()
	walletCount := 0
	for rows.Next() {
		var operatorContextID string
		var balance int64
		if err := rows.Scan(&operatorContextID, &balance); err != nil {
			t.Fatalf("scan OperatorContext wallet: %v", err)
		}
		walletCount++
		if balance != 750 {
			t.Fatalf("OperatorContext %s wallet balance=%d, want 750", operatorContextID, balance)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("read OperatorContext wallets: %v", err)
	}
	if walletCount != 2 {
		t.Fatalf("expected two isolated wallets, got %d", walletCount)
	}
}
