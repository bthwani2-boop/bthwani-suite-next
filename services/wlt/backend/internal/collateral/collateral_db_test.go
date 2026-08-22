package collateral

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"

	_ "github.com/lib/pq"

	"wlt-api/internal/ledger"
	"wlt-api/internal/reference"
	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

func collateralTestDB(t *testing.T) *sql.DB {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if url == "" {
		url = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", url)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open collateral integration database: %v", err)
		}
		t.Skipf("skipping collateral database integration test: %v", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		if requireDB {
			t.Fatalf("failed to ping collateral integration database: %v", err)
		}
		t.Skipf("skipping collateral database integration test: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func seedCapturedCaptainTopUp(t *testing.T, db *sql.DB, ctx context.Context, contextID, captainID string, amount int64) string {
	t.Helper()
	session, err := reference.CreateTopUpSession(db, reference.CreateTopUpSessionInput{
		ActorType: "captain", ActorID: captainID, TopUpReference: testsupport.UniqueID("collateral-topup"),
		OperatorContextID: contextID, AmountMinorUnits: amount, Currency: "YER",
		IdempotencyKey: testsupport.UniqueID("collateral-create"), CorrelationID: testsupport.UniqueID("collateral-corr"),
	})
	if err != nil {
		t.Fatalf("create captain topup: %v", err)
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	ledgerID, err := ledger.PostLedgerTransaction(ctx, tx, "cash_in_topup", "payment_session", session.ID, []ledger.LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: amount, Currency: "YER"},
		{AccountType: "wallet", ActorType: "captain", ActorID: captainID, DebitCredit: "credit", AmountMinorUnits: amount, Currency: "YER"},
	}, ledger.Actor{ID: captainID, Type: "captain"})
	if err != nil {
		_ = tx.Rollback()
		t.Fatalf("post captain topup ledger: %v", err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE wlt_payment_sessions SET status='captured',captured_at=NOW(),capture_ledger_transaction_id=$2,updated_at=NOW() WHERE id=$1`, session.ID, ledgerID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("mark topup captured: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	return session.ID
}

func TestCaptainCollateralAllocationAndSafeRelease(t *testing.T) {
	db := collateralTestDB(t)
	contextID := testsupport.UniqueID("collateral-context")
	captainID := testsupport.UniqueID("collateral-captain")
	ctx := shared.WithOperatorContext(context.Background(), contextID)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.PostOpeningBalance(ctx, tx, "captain", captainID, "YER", 10000, testsupport.UniqueID("collateral-opening"), ledger.Actor{ID: "collateral-test", Type: "test"}); err != nil {
		_ = tx.Rollback()
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	policy, err := UpsertPolicy(ctx, db, upsertPolicyInput{PolicyID: "captain-collateral-v1", Enabled: true, MinimumCollateralMinorUnits: 500, Currency: "YER", ChangeReason: "integration test", UpdatedByActorID: "test-operator"})
	if err != nil {
		t.Fatalf("upsert policy: %v", err)
	}
	if policy.PolicyVersion != 1 {
		t.Fatalf("expected policy version 1, got %d", policy.PolicyVersion)
	}
	first := seedCapturedCaptainTopUp(t, db, ctx, contextID, captainID, 2000)
	second := seedCapturedCaptainTopUp(t, db, ctx, contextID, captainID, 1000)
	p1, err := Allocate(ctx, db, "allocate-1", allocateInput{CaptainID: captainID, PaymentSessionID: first, AllocatedByActorID: captainID})
	if err != nil {
		t.Fatalf("allocate first collateral: %v", err)
	}
	if _, err := Allocate(ctx, db, "allocate-1", allocateInput{CaptainID: captainID, PaymentSessionID: first, AllocatedByActorID: captainID}); err != nil {
		t.Fatalf("idempotent allocation: %v", err)
	}
	p2, err := Allocate(ctx, db, "allocate-2", allocateInput{CaptainID: captainID, PaymentSessionID: second, AllocatedByActorID: captainID})
	if err != nil {
		t.Fatalf("allocate second collateral: %v", err)
	}
	if p1.RestrictedAmountMinorUnits != 2000 || p2.RestrictedAmountMinorUnits != 1000 {
		t.Fatalf("unexpected positions: %+v %+v", p1, p2)
	}
	wallet, err := Read(ctx, db, captainID)
	if err != nil {
		t.Fatalf("read collateral: %v", err)
	}
	if wallet.Wallet.CollateralReservedMinorUnits != 3000 || wallet.Wallet.AvailableMinorUnits != 10000 {
		t.Fatalf("collateral must reduce spendable projection: %+v", wallet.Wallet)
	}
	if _, err := Release(ctx, db, "release-1", releaseInput{CaptainID: captainID, PositionID: p2.ID, ReleaseReason: "safe release", ReleasedByActorID: captainID}); err != nil {
		t.Fatalf("release safe excess: %v", err)
	}
	wallet, err = Read(ctx, db, captainID)
	if err != nil {
		t.Fatal(err)
	}
	if wallet.Wallet.CollateralReservedMinorUnits != 2000 || wallet.Wallet.AvailableMinorUnits != 11000 {
		t.Fatalf("unexpected post-release wallet: %+v", wallet.Wallet)
	}
	if _, err := Release(ctx, db, "release-2", releaseInput{CaptainID: captainID, PositionID: p1.ID, ReleaseReason: "would breach protected minimum", ReleasedByActorID: captainID}); err == nil {
		t.Fatal("expected protected minimum release to be blocked")
	}
}

func TestCaptainCollateralReadBootstrapsBeforeWalletMaterialization(t *testing.T) {
	db := collateralTestDB(t)
	contextID := testsupport.UniqueID("collateral-empty-context")
	captainID := testsupport.UniqueID("collateral-empty-captain")
	ctx := shared.WithOperatorContext(context.Background(), contextID)
	if _, err := UpsertPolicy(ctx, db, upsertPolicyInput{
		PolicyID: "captain-collateral-local-v1", Enabled: true,
		MinimumCollateralMinorUnits: 1000, Currency: "YER",
		ChangeReason: "wallet bootstrap integration test", UpdatedByActorID: "test-operator",
	}); err != nil {
		t.Fatalf("upsert policy: %v", err)
	}
	readback, err := Read(ctx, db, captainID)
	if err != nil {
		t.Fatalf("read collateral before wallet materialization: %v", err)
	}
	if readback.Policy == nil || readback.Policy.MinimumCollateralMinorUnits != 1000 {
		t.Fatalf("expected configured policy, got %+v", readback.Policy)
	}
	if readback.Wallet != (WalletSummary{}) {
		t.Fatalf("expected zero wallet summary before materialization, got %+v", readback.Wallet)
	}
	if len(readback.Positions) != 0 {
		t.Fatalf("expected no collateral positions before materialization, got %d", len(readback.Positions))
	}
}

func TestCaptainCollateralRejectsDisabledAndInvalidSources(t *testing.T) {
	db := collateralTestDB(t)
	contextID := testsupport.UniqueID("collateral-reject-context")
	captainID := testsupport.UniqueID("collateral-reject-captain")
	ctx := shared.WithOperatorContext(context.Background(), contextID)

	if _, err := UpsertPolicy(ctx, db, upsertPolicyInput{
		PolicyID: "captain-collateral-reject-v1", Enabled: false,
		MinimumCollateralMinorUnits: 500, Currency: "YER",
		ChangeReason: "disabled policy integration test", UpdatedByActorID: "test-operator",
	}); err != nil {
		t.Fatalf("upsert disabled policy: %v", err)
	}
	if _, err := Allocate(ctx, db, "disabled-allocation", allocateInput{
		CaptainID: captainID, PaymentSessionID: "missing-session", AllocatedByActorID: captainID,
	}); !errors.Is(err, ErrPolicyDisabled) {
		t.Fatalf("allocate with disabled policy error=%v, want %v", err, ErrPolicyDisabled)
	}
	if _, err := UpsertPolicy(ctx, db, upsertPolicyInput{
		PolicyID: "captain-collateral-reject-v1", ExpectedVersion: 1, Enabled: true,
		MinimumCollateralMinorUnits: 500, Currency: "YER",
		ChangeReason: "enable policy for source validation", UpdatedByActorID: "test-operator",
	}); err != nil {
		t.Fatalf("enable policy: %v", err)
	}
	if _, err := Allocate(ctx, db, "missing-source", allocateInput{
		CaptainID: captainID, PaymentSessionID: "missing-session", AllocatedByActorID: captainID,
	}); !errors.Is(err, ErrSourceNotCaptured) {
		t.Fatalf("allocate with missing source error=%v, want %v", err, ErrSourceNotCaptured)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.PostOpeningBalance(ctx, tx, "captain", captainID, "YER", 1000, testsupport.UniqueID("collateral-reject-opening"), ledger.Actor{ID: "collateral-test", Type: "test"}); err != nil {
		_ = tx.Rollback()
		t.Fatalf("post opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	sessionID := seedCapturedCaptainTopUp(t, db, ctx, contextID, captainID, 2000)
	if _, err := db.ExecContext(ctx, `UPDATE wlt_wallets SET held_balance_minor_units=2500 WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`, contextID, captainID); err != nil {
		t.Fatalf("create insufficient spendable wallet: %v", err)
	}
	if _, err := Allocate(ctx, db, "insufficient-funds", allocateInput{
		CaptainID: captainID, PaymentSessionID: sessionID, AllocatedByActorID: captainID,
	}); !errors.Is(err, ErrCollateralFundsUnavailable) {
		t.Fatalf("allocate with insufficient funds error=%v, want %v", err, ErrCollateralFundsUnavailable)
	}
}

func TestCaptainCollateralReleaseBlocksOnEveryOpenExposure(t *testing.T) {
	db := collateralTestDB(t)
	contextID := testsupport.UniqueID("collateral-block-context")
	captainID := testsupport.UniqueID("collateral-block-captain")
	ctx := shared.WithOperatorContext(context.Background(), contextID)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ledger.PostOpeningBalance(ctx, tx, "captain", captainID, "YER", 5000, testsupport.UniqueID("collateral-block-opening"), ledger.Actor{ID: "collateral-test", Type: "test"}); err != nil {
		_ = tx.Rollback()
		t.Fatalf("post opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if _, err := UpsertPolicy(ctx, db, upsertPolicyInput{
		PolicyID: "captain-collateral-block-v1", Enabled: true,
		MinimumCollateralMinorUnits: 500, Currency: "YER",
		ChangeReason: "release blocker integration test", UpdatedByActorID: "test-operator",
	}); err != nil {
		t.Fatalf("upsert policy: %v", err)
	}
	sessionID := seedCapturedCaptainTopUp(t, db, ctx, contextID, captainID, 2000)
	position, err := Allocate(ctx, db, "block-allocation", allocateInput{CaptainID: captainID, PaymentSessionID: sessionID, AllocatedByActorID: captainID})
	if err != nil {
		t.Fatalf("allocate collateral: %v", err)
	}

	blockers := []struct {
		name   string
		set    string
		reason string
	}{
		{name: "pending", set: "pending_balance_minor_units", reason: "WLT_COLLATERAL_RELEASE_PENDING_FUNDS"},
		{name: "held", set: "held_balance_minor_units", reason: "WLT_COLLATERAL_RELEASE_HELD_FUNDS"},
		{name: "cod", set: "cod_reserved_balance_minor_units", reason: "WLT_COLLATERAL_RELEASE_COD_RESERVATION_OPEN"},
	}
	for _, blocker := range blockers {
		if _, err := db.ExecContext(ctx, `UPDATE wlt_wallets SET pending_balance_minor_units=0,held_balance_minor_units=0,cod_reserved_balance_minor_units=0 WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`, contextID, captainID); err != nil {
			t.Fatalf("reset wallet for %s blocker: %v", blocker.name, err)
		}
		if _, err := db.ExecContext(ctx, `UPDATE wlt_wallets SET `+blocker.set+`=1 WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`, contextID, captainID); err != nil {
			t.Fatalf("set %s blocker: %v", blocker.name, err)
		}
		if _, err := Release(ctx, db, testsupport.UniqueID("blocked-release"), releaseInput{CaptainID: captainID, PositionID: position.ID, ReleaseReason: "blocked by open exposure", ReleasedByActorID: captainID}); !errors.Is(err, ErrReleaseBlocked) || err.Error() == ErrReleaseBlocked.Error() {
			t.Fatalf("%s release error=%v, want wrapped %v", blocker.name, err, ErrReleaseBlocked)
		}
		readback, err := Read(ctx, db, captainID)
		if err != nil {
			t.Fatalf("read %s blocker: %v", blocker.name, err)
		}
		if readback.ReleaseBlockedReason != blocker.reason {
			t.Fatalf("read %s blocker reason=%q, want %q", blocker.name, readback.ReleaseBlockedReason, blocker.reason)
		}
	}

	if _, err := db.ExecContext(ctx, `UPDATE wlt_wallets SET pending_balance_minor_units=0,held_balance_minor_units=0,cod_reserved_balance_minor_units=0 WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`, contextID, captainID); err != nil {
		t.Fatal(err)
	}
	tx, err = db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	ledgerID, err := ledger.PostLedgerTransaction(ctx, tx, "provider_penalty_posted", "provider_incident", testsupport.UniqueID("collateral-debt-source"), []ledger.LedgerLine{
		{AccountType: "provider_receivable", DebitCredit: "debit", AmountMinorUnits: 700, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 700, Currency: "YER"},
	}, ledger.Actor{ID: "collateral-test", Type: "operator"})
	if err != nil {
		_ = tx.Rollback()
		t.Fatalf("post provider debt ledger: %v", err)
	}
	debtSourceID := testsupport.UniqueID("collateral-debt-source-row")
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_provider_debts(operator_context_id,provider_actor_id,provider_actor_type,source_type,source_id,policy_id,policy_version,original_amount_minor_units,outstanding_amount_minor_units,currency,ledger_transaction_id) VALUES($1,$2,'captain','provider_penalty',$3,'collateral-test','v1',700,700,'YER',$4)`, contextID, captainID, debtSourceID, ledgerID); err != nil {
		_ = tx.Rollback()
		t.Fatalf("insert provider debt: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if _, err := Release(ctx, db, testsupport.UniqueID("debt-blocked-release"), releaseInput{CaptainID: captainID, PositionID: position.ID, ReleaseReason: "blocked by provider debt", ReleasedByActorID: captainID}); !errors.Is(err, ErrReleaseBlocked) || err.Error() == ErrReleaseBlocked.Error() {
		t.Fatalf("provider debt release error=%v, want wrapped %v", err, ErrReleaseBlocked)
	}
	readback, err := Read(ctx, db, captainID)
	if err != nil {
		t.Fatalf("read provider debt blocker: %v", err)
	}
	if readback.ReleaseBlockedReason != "WLT_COLLATERAL_RELEASE_PROVIDER_DEBT_OPEN" {
		t.Fatalf("provider debt blocker reason=%q", readback.ReleaseBlockedReason)
	}
}
