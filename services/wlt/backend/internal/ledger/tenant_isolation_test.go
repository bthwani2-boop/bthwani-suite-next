package ledger

import (
	"context"
	"strings"
	"testing"

	"wlt-api/internal/shared"
)

func TestPostLedgerTransaction_ActiveSaaSRequiresTrustedTenant(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()
	_, err = PostLedgerTransaction(context.Background(), tx, "tenant_required", "test", uniqueActorID("ref"), []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: uniqueActorID("client"), DebitCredit: "debit", AmountMinorUnits: 100, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 100, Currency: "YER"},
	}, Actor{ID: "system", Type: "system"})
	if err == nil || !strings.Contains(err.Error(), "trusted tenant context is required") {
		t.Fatalf("expected fail-closed tenant error, got %v", err)
	}
}

func TestPostLedgerTransaction_IsolatesSameReferenceAndActorAcrossTenants(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	actorID := uniqueActorID("shared-client")
	referenceID := uniqueActorID("shared-reference")
	lines := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 750, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 750, Currency: "YER"},
	}

	for _, tenantID := range []string{"tenant-a-" + referenceID, "tenant-b-" + referenceID} {
		ctx := shared.WithTenantContext(context.Background(), tenantID)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("begin tenant %s tx: %v", tenantID, err)
		}
		if _, err := PostLedgerTransaction(ctx, tx, "same_reference", "test", referenceID, lines, Actor{ID: "system", Type: "system"}); err != nil {
			tx.Rollback()
			t.Fatalf("post tenant %s transaction: %v", tenantID, err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit tenant %s transaction: %v", tenantID, err)
		}
	}

	var transactionCount int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM wlt_ledger_transactions
		WHERE transaction_type='same_reference' AND reference_type='test' AND reference_id=$1`, referenceID).Scan(&transactionCount); err != nil {
		t.Fatalf("count tenant transactions: %v", err)
	}
	if transactionCount != 2 {
		t.Fatalf("expected two tenant-local transactions, got %d", transactionCount)
	}

	rows, err := db.Query(`
		SELECT tenant_id, balance_minor_units
		FROM wlt_ledger_accounts
		WHERE account_type='wallet' AND actor_type='client' AND actor_id=$1 AND currency='YER'
		ORDER BY tenant_id`, actorID)
	if err != nil {
		t.Fatalf("read tenant wallets: %v", err)
	}
	defer rows.Close()
	walletCount := 0
	for rows.Next() {
		var tenantID string
		var balance int64
		if err := rows.Scan(&tenantID, &balance); err != nil {
			t.Fatalf("scan tenant wallet: %v", err)
		}
		walletCount++
		if balance != 750 {
			t.Fatalf("tenant %s wallet balance=%d, want 750", tenantID, balance)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("read tenant wallets: %v", err)
	}
	if walletCount != 2 {
		t.Fatalf("expected two isolated wallets, got %d", walletCount)
	}
}
