package ledger

import (
	"context"
	"fmt"
	"testing"

	"wlt-api/internal/shared"
)

func postCommittedOpeningBalance(t *testing.T, ctx context.Context, actorType, actorID, currency string, amount int64) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		t.Skip("database unavailable")
	}
	defer db.Close()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin opening-balance transaction: %v", err)
	}
	defer tx.Rollback()
	if _, err := PostOpeningBalance(
		ctx,
		tx,
		actorType,
		actorID,
		currency,
		amount,
		uniqueActorID("wallet-projection-opening"),
		Actor{ID: "projection-test", Type: "test"},
	); err != nil {
		t.Fatalf("post opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit opening balance: %v", err)
	}
}

func TestWalletProjection_CanonicalPostingMaterializesAvailable(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := trustedLedgerTestContext()
	actorID := uniqueActorID("projection-captain")
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 5000, uniqueActorID("projection-open"), Actor{ID: "system", Type: "system"}); err != nil {
		t.Fatalf("post opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}

	var available, pending, held, codReserved int64
	if err := db.QueryRowContext(ctx, `
		SELECT available_balance_minor_units, pending_balance_minor_units,
		       held_balance_minor_units, cod_reserved_balance_minor_units
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		"OperatorContext-ledger-tests", actorID,
	).Scan(&available, &pending, &held, &codReserved); err != nil {
		t.Fatalf("read materialized wallet: %v", err)
	}
	if available != 5000 || pending != 0 || held != 0 || codReserved != 0 {
		t.Fatalf("unexpected materialized wallet: available=%d pending=%d held=%d cod=%d", available, pending, held, codReserved)
	}
}

func TestWalletProjection_RejectsOffLedgerAvailableMutation(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := trustedLedgerTestContext()
	actorID := uniqueActorID("projection-no-direct")
	postCommittedOpeningBalance(t, ctx, "captain", actorID, "YER", 4000)

	if _, err := db.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET available_balance_minor_units=999999
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		"OperatorContext-ledger-tests", actorID,
	); err != nil {
		t.Fatalf("projection rejected safe recalculation unexpectedly: %v", err)
	}

	var available int64
	if err := db.QueryRowContext(ctx, `
		SELECT available_balance_minor_units
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		"OperatorContext-ledger-tests", actorID,
	).Scan(&available); err != nil {
		t.Fatalf("read wallet: %v", err)
	}
	if available != 4000 {
		t.Fatalf("off-ledger available mutation changed canonical projection: got %d want 4000", available)
	}
}

func TestWalletProjection_DerivesAvailableFromRestrictedBuckets(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	ctx := trustedLedgerTestContext()
	actorID := uniqueActorID("projection-hold")
	postCommittedOpeningBalance(t, ctx, "captain", actorID, "YER", 3000)

	if _, err := db.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET held_balance_minor_units=700,
		    available_balance_minor_units=available_balance_minor_units-700
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		"OperatorContext-ledger-tests", actorID,
	); err != nil {
		t.Fatalf("apply payout hold bucket: %v", err)
	}

	var available, held int64
	if err := db.QueryRowContext(ctx, `
		SELECT available_balance_minor_units, held_balance_minor_units
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		"OperatorContext-ledger-tests", actorID,
	).Scan(&available, &held); err != nil {
		t.Fatalf("read held wallet: %v", err)
	}
	if available != 2300 || held != 700 {
		t.Fatalf("expected canonical 3000 split into available=2300 held=700, got available=%d held=%d", available, held)
	}

	if _, err := db.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET held_balance_minor_units=4000
		WHERE operator_context_id=$1 AND actor_type='captain' AND actor_id=$2`,
		"OperatorContext-ledger-tests", actorID,
	); err == nil {
		t.Fatal("expected restricted balance above canonical value to fail closed")
	}
}

func TestWalletProjection_IsolatesSameActorAcrossOperatorContexts(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	actorID := uniqueActorID("same-actor")
	contextAID := fmt.Sprintf("projection-a-%s", uniqueActorID("ctx"))
	contextBID := fmt.Sprintf("projection-b-%s", uniqueActorID("ctx"))
	ctxA := shared.WithOperatorContext(context.Background(), contextAID)
	ctxB := shared.WithOperatorContext(context.Background(), contextBID)

	postCommittedOpeningBalance(t, ctxA, "captain", actorID, "YER", 1200)
	postCommittedOpeningBalance(t, ctxB, "captain", actorID, "YER", 8800)

	projectionA, err := GetWalletLedgerProjection(ctxA, db, "captain", actorID, "YER")
	if err != nil {
		t.Fatalf("projection A: %v", err)
	}
	projectionB, err := GetWalletLedgerProjection(ctxB, db, "captain", actorID, "YER")
	if err != nil {
		t.Fatalf("projection B: %v", err)
	}
	if projectionA == nil || projectionA.BalanceMinorUnits != 1200 {
		t.Fatalf("context A projection leaked or drifted: %+v", projectionA)
	}
	if projectionB == nil || projectionB.BalanceMinorUnits != 8800 {
		t.Fatalf("context B projection leaked or drifted: %+v", projectionB)
	}
}
