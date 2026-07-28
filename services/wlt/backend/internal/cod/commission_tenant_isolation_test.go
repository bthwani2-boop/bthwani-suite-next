package cod

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

func commissionTenantTestDB(t *testing.T) *sql.DB {
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

func TestGovernedCommissionFailsClosedWithoutTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	_, err := CreateGovernedCommission(
		context.Background(),
		nil,
		CreateGovernedCommissionInput{},
		"correlation-tenant-required",
	)
	if err == nil || !strings.Contains(err.Error(), "trusted tenant context is required") {
		t.Fatalf("expected fail-closed tenant error, got %v", err)
	}
}

func TestGovernedCommissionSeparatesIdenticalTenantBusinessIdentities(t *testing.T) {
	db := commissionTenantTestDB(t)
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")

	suffix := fmt.Sprint(time.Now().UnixNano())
	tenants := []string{"tenant-commission-a-" + suffix, "tenant-commission-b-" + suffix}
	policyID := "policy-shared-" + suffix
	actorID := "field-shared-" + suffix
	idempotencyKey := "commission-shared-" + suffix
	sourceID := "source-shared-" + suffix

	for index, tenantID := range tenants {
		ctx := shared.WithTenantContext(context.Background(), tenantID)
		amount := int64(100 + index)
		maximum := amount
		policy, err := UpsertGovernedCommissionPolicyIdempotent(
			ctx,
			db,
			UpsertGovernedCommissionPolicyInput{
				PolicyID:                policyID,
				CommissionType:          "field_visit_fee",
				SourceType:              "field_visit",
				BeneficiaryActorType:    "field",
				CalculationType:         "fixed",
				FixedAmountMinorUnits:   amount,
				MinimumAmountMinorUnits: amount,
				MaximumAmountMinorUnits: &maximum,
				Currency:                "YER",
				Status:                  "active",
				ChangeReason:            "prove tenant-local commission policy",
				OperatorID:              "operator-test",
			},
			"policy-correlation-"+tenantID,
			"policy-idempotency-shared-"+suffix,
		)
		if err != nil {
			t.Fatalf("upsert %s policy: %v", tenantID, err)
		}
		if policy == nil || policy.FixedAmountMinorUnits != amount {
			t.Fatalf("tenant %s policy=%+v, want amount %d", tenantID, policy, amount)
		}

		commission, err := CreateGovernedCommission(
			ctx,
			db,
			CreateGovernedCommissionInput{
				BeneficiaryActorID:   actorID,
				BeneficiaryActorType: "field",
				SourceType:           "field_visit",
				SourceID:             sourceID,
				CommissionType:       "field_visit_fee",
				SourceEvidenceID:     sourceID,
				SourceEvidenceHash:   "evidence-" + suffix,
				SourceEvidenceStatus: "completed",
				Currency:             "YER",
				IdempotencyKey:       idempotencyKey,
			},
			"commission-correlation-"+tenantID,
		)
		if err != nil {
			t.Fatalf("create %s commission: %v", tenantID, err)
		}
		if commission == nil || commission.AmountMinorUnits != amount {
			t.Fatalf("tenant %s commission=%+v, want amount %d", tenantID, commission, amount)
		}
	}

	var commissionCount, walletCount, ledgerCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_commissions
		WHERE tenant_id = ANY($1::text[]) AND idempotency_key=$2`,
		pqCommissionTextArray(tenants), idempotencyKey).Scan(&commissionCount); err != nil {
		t.Fatal(err)
	}
	if commissionCount != 2 {
		t.Fatalf("expected two tenant-local commissions, got %d", commissionCount)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_wallets
		WHERE tenant_id = ANY($1::text[]) AND actor_type='field' AND actor_id=$2`,
		pqCommissionTextArray(tenants), actorID).Scan(&walletCount); err != nil {
		t.Fatal(err)
	}
	if walletCount != 2 {
		t.Fatalf("expected two tenant-local wallets, got %d", walletCount)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_ledger_transactions
		WHERE tenant_id = ANY($1::text[]) AND transaction_type='commission_earned'`,
		pqCommissionTextArray(tenants)).Scan(&ledgerCount); err != nil {
		t.Fatal(err)
	}
	if ledgerCount < 2 {
		t.Fatalf("expected tenant-local commission ledger transactions, got %d", ledgerCount)
	}
}

func pqCommissionTextArray(values []string) string {
	out := "{"
	for i, value := range values {
		if i > 0 {
			out += ","
		}
		out += `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
	}
	return out + "}"
}
