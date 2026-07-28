package wallet

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/shared"
)

func walletTestDB(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := strings.TrimSpace(os.Getenv("WLT_TEST_DATABASE_URL"))
	if databaseURL == "" {
		t.Skip("WLT_TEST_DATABASE_URL is not configured")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatalf("open WLT test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		t.Fatalf("ping WLT test database: %v", err)
	}
	return db
}

func TestEnsureWalletForTenantTxSeparatesIdenticalActors(t *testing.T) {
	db := walletTestDB(t)
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")

	suffix := fmt.Sprint(time.Now().UnixNano())
	actorID := "shared-field-" + suffix
	tenants := []string{"tenant-a-" + suffix, "tenant-b-" + suffix}
	for _, tenantID := range tenants {
		ctx := shared.WithTenantContext(context.Background(), tenantID)
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatalf("begin %s wallet tx: %v", tenantID, err)
		}
		wallet, err := EnsureWalletForTenantTx(ctx, tx, "field", actorID, "YER")
		if err != nil {
			tx.Rollback()
			t.Fatalf("ensure %s wallet: %v", tenantID, err)
		}
		if wallet.ActorID != actorID || wallet.Currency != "YER" {
			tx.Rollback()
			t.Fatalf("unexpected %s wallet: %+v", tenantID, wallet)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit %s wallet: %v", tenantID, err)
		}
	}

	var count int
	if err := db.QueryRow(`
		SELECT COUNT(*) FROM wlt_wallets
		WHERE tenant_id = ANY($1::text[]) AND actor_type='field' AND actor_id=$2`,
		pqTextArray(tenants), actorID,
	).Scan(&count); err != nil {
		t.Fatalf("count tenant wallets: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected two isolated tenant wallets, got %d", count)
	}
}

func TestLegacyEnsureWalletFailsClosedInActiveSaaS(t *testing.T) {
	db := walletTestDB(t)
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin wallet tx: %v", err)
	}
	defer tx.Rollback()

	_, err = EnsureWalletTx(tx, "field", "legacy-field", "YER")
	if err == nil || !strings.Contains(err.Error(), "trusted tenant context is required") {
		t.Fatalf("expected fail-closed tenant error, got %v", err)
	}
}

func pqTextArray(values []string) string {
	out := "{"
	for i, value := range values {
		if i > 0 {
			out += ","
		}
		out += `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
	}
	return out + "}"
}
