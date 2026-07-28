package settlement

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

func openSettlementTenantDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("WLT_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WLT_REQUIRE_DB_TESTS=true to run WLT DB integration tests")
	}
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when WLT_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}
	return db
}

func TestSettlementPolicyActiveSaaSFailsClosedWithoutTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	_, err := UpsertGovernedSettlementPolicyIdempotent(
		context.Background(),
		nil,
		"partner-tenant-required",
		UpsertGovernedSettlementPolicyInput{
			FeeBasisPoints:       100,
			Currency:             "YER",
			Status:               "active",
			CycleDays:            7,
			MinimumNetMinorUnits: 0,
			ChangeReason:         "tenant isolation test",
			OperatorID:           "operator-test",
		},
		"correlation-tenant-required",
		"idempotency-tenant-required",
	)
	if err == nil || !strings.Contains(err.Error(), "trusted tenant context is required") {
		t.Fatalf("expected fail-closed tenant error, got %v", err)
	}
}

func TestSettlementPolicySamePartnerAndIdempotencyKeyAreTenantLocal(t *testing.T) {
	db := openSettlementTenantDB(t)
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	suffix := fmt.Sprint(time.Now().UnixNano())
	partnerID := "partner-settlement-tenant-" + suffix
	idempotencyKey := "settlement-policy-shared-" + suffix
	tenantA := "tenant-settlement-a-" + suffix
	tenantB := "tenant-settlement-b-" + suffix

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_jrn036_mutation_receipts WHERE tenant_id IN ($1,$2)`, tenantA, tenantB)
		_, _ = db.Exec(`DELETE FROM wlt_jrn036_audit_events WHERE tenant_id IN ($1,$2)`, tenantA, tenantB)
		_, _ = db.Exec(`DELETE FROM wlt_jrn036_settlement_policy_versions WHERE tenant_id IN ($1,$2) AND partner_id=$3`, tenantA, tenantB, partnerID)
		_, _ = db.Exec(`DELETE FROM wlt_settlement_policies WHERE tenant_id IN ($1,$2) AND partner_id=$3`, tenantA, tenantB, partnerID)
	})

	for index, tenantID := range []string{tenantA, tenantB} {
		ctx := shared.WithTenantContext(context.Background(), tenantID)
		fee := 100 + index
		policy, err := UpsertGovernedSettlementPolicyIdempotent(
			ctx,
			db,
			partnerID,
			UpsertGovernedSettlementPolicyInput{
				FeeBasisPoints:       fee,
				Currency:             "YER",
				Status:               "active",
				CycleDays:            7,
				MinimumNetMinorUnits: 0,
				ChangeReason:         "prove tenant-local settlement policy",
				OperatorID:           "operator-test",
			},
			"correlation-"+tenantID,
			idempotencyKey,
		)
		if err != nil {
			t.Fatalf("upsert tenant %s policy: %v", tenantID, err)
		}
		if policy == nil || policy.FeeBasisPoints != fee {
			t.Fatalf("tenant %s policy=%+v, want fee %d", tenantID, policy, fee)
		}
	}

	var policyCount, receiptCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_settlement_policies WHERE partner_id=$1 AND tenant_id IN ($2,$3)`, partnerID, tenantA, tenantB).Scan(&policyCount); err != nil {
		t.Fatal(err)
	}
	if policyCount != 2 {
		t.Fatalf("expected two tenant-local settlement policies, got %d", policyCount)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_jrn036_mutation_receipts WHERE idempotency_key=$1 AND tenant_id IN ($2,$3)`, idempotencyKey, tenantA, tenantB).Scan(&receiptCount); err != nil {
		t.Fatal(err)
	}
	if receiptCount != 2 {
		t.Fatalf("expected two tenant-local idempotency receipts, got %d", receiptCount)
	}
}
