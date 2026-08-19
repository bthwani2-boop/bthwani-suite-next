package collateral

import (
	"context"
	"database/sql"
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
