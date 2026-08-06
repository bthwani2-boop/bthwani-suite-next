package cod

// Note: these tests exercise the per-row operator_context_id scoping guards
// inside a single WLT deployment (WHERE operator_context_id=$1 filters and
// RequireOperatorContextScope checks). They do not exercise or assert
// network-level multi-tenant isolation -- the DSH service bridge binds every
// request to one fixed deployment-owned context (see
// internal/shared/serviceauth.go). See governance decision Q1/T4.

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

func commissionOperatorContextTestDB(t *testing.T) *sql.DB {
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

func TestGovernedCommissionFailsClosedWithoutOperatorContext(t *testing.T) {
	_, err := CreateGovernedCommission(
		context.Background(),
		nil,
		CreateGovernedCommissionInput{},
		"correlation-OperatorContext-required",
	)
	if err == nil || !strings.Contains(err.Error(), "trusted OperatorContext context is required") {
		t.Fatalf("expected fail-closed OperatorContext error, got %v", err)
	}
}

func TestGovernedCommissionSeparatesIdenticalOperatorContextBusinessIdentities(t *testing.T) {
	db := commissionOperatorContextTestDB(t)
	defer db.Close()

	suffix := fmt.Sprint(time.Now().UnixNano())
	OperatorContexts := []string{"OperatorContext-commission-a-" + suffix, "OperatorContext-commission-b-" + suffix}
	policyID := "policy-shared-" + suffix
	actorID := "field-shared-" + suffix
	idempotencyKey := "commission-shared-" + suffix
	sourceID := "source-shared-" + suffix

	for index, operatorContextID := range OperatorContexts {
		ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
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
				ChangeReason:            "prove OperatorContext-local commission policy",
				OperatorID:              "operator-test",
			},
			"policy-correlation-"+operatorContextID,
			"policy-idempotency-shared-"+suffix,
		)
		if err != nil {
			t.Fatalf("upsert %s policy: %v", operatorContextID, err)
		}
		if policy == nil || policy.FixedAmountMinorUnits != amount {
			t.Fatalf("OperatorContext %s policy=%+v, want amount %d", operatorContextID, policy, amount)
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
			"commission-correlation-"+operatorContextID,
		)
		if err != nil {
			t.Fatalf("create %s commission: %v", operatorContextID, err)
		}
		if commission == nil || commission.AmountMinorUnits != amount {
			t.Fatalf("OperatorContext %s commission=%+v, want amount %d", operatorContextID, commission, amount)
		}
	}

	var commissionCount, walletCount, ledgerCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_commissions
		WHERE operator_context_id = ANY($1::text[]) AND idempotency_key=$2`,
		pqCommissionTextArray(OperatorContexts), idempotencyKey).Scan(&commissionCount); err != nil {
		t.Fatal(err)
	}
	if commissionCount != 2 {
		t.Fatalf("expected two OperatorContext-local commissions, got %d", commissionCount)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_wallets
		WHERE operator_context_id = ANY($1::text[]) AND actor_type='field' AND actor_id=$2`,
		pqCommissionTextArray(OperatorContexts), actorID).Scan(&walletCount); err != nil {
		t.Fatal(err)
	}
	if walletCount != 2 {
		t.Fatalf("expected two OperatorContext-local wallets, got %d", walletCount)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_ledger_transactions
		WHERE operator_context_id = ANY($1::text[]) AND transaction_type='commission_earned'`,
		pqCommissionTextArray(OperatorContexts)).Scan(&ledgerCount); err != nil {
		t.Fatal(err)
	}
	if ledgerCount < 2 {
		t.Fatalf("expected OperatorContext-local commission ledger transactions, got %d", ledgerCount)
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
