package commercial

import (
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"wlt-api/internal/shared"
)

func TestStoreOnboardingFeePolicyMutationIsContextScopedVersionedAndIdempotentDBIntegration(t *testing.T) {
	if os.Getenv("WLT_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WLT_REQUIRE_DB_TESTS=true to run WLT DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
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
	operatorContextID := "fee-test-" + time.Now().UTC().Format("20060102150405.000000000")
	ctx := shared.WithOperatorContext(t.Context(), operatorContextID)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_store_onboarding_fee_policy_versions WHERE operator_context_id=$1`, operatorContextID)
		_, _ = db.Exec(`DELETE FROM wlt_mutation_receipts WHERE operator_context_id=$1`, operatorContextID)
	})
	input := StoreOnboardingFeePolicyInput{
		Enabled: true, AmountMinorUnits: 2500, Currency: "YER", AppliesTo: "first_store", ChargeTiming: "on_approval",
		Notes: "integration policy", ExpectedVersion: 0, Reason: "integration test", CreatedByActorID: "fee-test-operator",
	}
	policy, replay, err := UpsertStoreOnboardingFeePolicy(ctx, db, input, onboardingFeeMutationMeta{IdempotencyKey: "fee-test-idem-1", CorrelationID: "fee-test-corr-1"})
	if err != nil {
		t.Fatal(err)
	}
	if replay || policy.Version != 1 || !policy.IsConfigured || policy.ActorCharged != "partner" {
		t.Fatalf("unexpected initial policy: replay=%v policy=%#v", replay, policy)
	}
	replayed, replay, err := UpsertStoreOnboardingFeePolicy(ctx, db, input, onboardingFeeMutationMeta{IdempotencyKey: "fee-test-idem-1", CorrelationID: "fee-test-corr-1"})
	if err != nil || !replay || replayed.Version != 1 {
		t.Fatalf("idempotent replay mismatch: replay=%v policy=%#v err=%v", replay, replayed, err)
	}
	conflict := input
	conflict.AmountMinorUnits = 2600
	if _, _, err := UpsertStoreOnboardingFeePolicy(ctx, db, conflict, onboardingFeeMutationMeta{IdempotencyKey: "fee-test-idem-1", CorrelationID: "fee-test-corr-1"}); !errors.Is(err, shared.ErrMutationIdempotencyConflict) {
		t.Fatalf("expected mutation idempotency conflict, got %v", err)
	}
	next := input
	next.ExpectedVersion = 1
	next.Enabled = false
	updated, replay, err := UpsertStoreOnboardingFeePolicy(ctx, db, next, onboardingFeeMutationMeta{IdempotencyKey: "fee-test-idem-2", CorrelationID: "fee-test-corr-2"})
	if err != nil || replay || updated.Version != 2 || updated.Enabled {
		t.Fatalf("versioned update mismatch: replay=%v policy=%#v err=%v", replay, updated, err)
	}
	readback, err := GetStoreOnboardingFeePolicy(ctx, db)
	if err != nil || readback.Version != 2 || readback.Enabled {
		t.Fatalf("canonical fee readback mismatch: policy=%#v err=%v", readback, err)
	}
}
