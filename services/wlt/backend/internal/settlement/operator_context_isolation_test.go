package settlement

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

func openSettlementOperatorContextDB(t *testing.T) *sql.DB {
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

func TestSettlementPolicyFailsClosedWithoutOperatorContext(t *testing.T) {
	_, err := UpsertGovernedSettlementPolicyIdempotent(
		context.Background(),
		nil,
		"partner-OperatorContext-required",
		UpsertGovernedSettlementPolicyInput{
			FeeBasisPoints:       100,
			Currency:             "YER",
			Status:               "active",
			CycleDays:            7,
			MinimumNetMinorUnits: 0,
			ChangeReason:         "OperatorContext isolation test",
			OperatorID:           "operator-test",
		},
		"correlation-OperatorContext-required",
		"idempotency-OperatorContext-required",
	)
	if err == nil || !strings.Contains(err.Error(), "trusted OperatorContext context is required") {
		t.Fatalf("expected fail-closed OperatorContext error, got %v", err)
	}
}

func TestSettlementPolicySamePartnerAndIdempotencyKeyAreOperatorContextLocal(t *testing.T) {
	db := openSettlementOperatorContextDB(t)
	suffix := fmt.Sprint(time.Now().UnixNano())
	partnerID := "partner-settlement-OperatorContext-" + suffix
	idempotencyKey := "settlement-policy-shared-" + suffix
	OperatorContextA := "OperatorContext-settlement-a-" + suffix
	OperatorContextB := "OperatorContext-settlement-b-" + suffix

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_mutation_receipts WHERE operator_context_id IN ($1,$2)`, OperatorContextA, OperatorContextB)
		_, _ = db.Exec(`DELETE FROM wlt_finance_audit_events WHERE operator_context_id IN ($1,$2)`, OperatorContextA, OperatorContextB)
		_, _ = db.Exec(`DELETE FROM wlt_settlement_policy_versions WHERE operator_context_id IN ($1,$2) AND partner_id=$3`, OperatorContextA, OperatorContextB, partnerID)
		_, _ = db.Exec(`DELETE FROM wlt_settlement_policies WHERE operator_context_id IN ($1,$2) AND partner_id=$3`, OperatorContextA, OperatorContextB, partnerID)
	})

	for index, operatorContextID := range []string{OperatorContextA, OperatorContextB} {
		ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
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
				ChangeReason:         "prove OperatorContext-local settlement policy",
				OperatorID:           "operator-test",
			},
			"correlation-"+operatorContextID,
			idempotencyKey,
		)
		if err != nil {
			t.Fatalf("upsert OperatorContext %s policy: %v", operatorContextID, err)
		}
		if policy == nil || policy.FeeBasisPoints != fee {
			t.Fatalf("OperatorContext %s policy=%+v, want fee %d", operatorContextID, policy, fee)
		}
	}

	var policyCount, receiptCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_settlement_policies WHERE partner_id=$1 AND operator_context_id IN ($2,$3)`, partnerID, OperatorContextA, OperatorContextB).Scan(&policyCount); err != nil {
		t.Fatal(err)
	}
	if policyCount != 2 {
		t.Fatalf("expected two OperatorContext-local settlement policies, got %d", policyCount)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_mutation_receipts WHERE idempotency_key=$1 AND operator_context_id IN ($2,$3)`, idempotencyKey, OperatorContextA, OperatorContextB).Scan(&receiptCount); err != nil {
		t.Fatal(err)
	}
	if receiptCount != 2 {
		t.Fatalf("expected two OperatorContext-local idempotency receipts, got %d", receiptCount)
	}
}
