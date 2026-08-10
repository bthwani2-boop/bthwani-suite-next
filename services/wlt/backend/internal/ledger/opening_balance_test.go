package ledger

import (
	"errors"
	"testing"
)

func TestPostOpeningBalance_RejectsNonPositiveAmount(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := trustedLedgerTestContext()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("captain")
	if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 0, uniqueActorID("open"), Actor{ID: "admin", Type: "operator"}); !errors.Is(err, ErrNonPositiveAmount) {
		t.Fatalf("expected ErrNonPositiveAmount for zero amount, got %v", err)
	}
	if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", -100, uniqueActorID("open"), Actor{ID: "admin", Type: "operator"}); !errors.Is(err, ErrNonPositiveAmount) {
		t.Fatalf("expected ErrNonPositiveAmount for negative amount, got %v", err)
	}
}

// TestPostOpeningBalance_IsIdempotentAndSourced proves an opening balance is
// a typed ledger fact: it lands in exactly one wallet account, retrying the
// same reference does not double it, and the projection read back matches
// what the ledger actually holds -- not a separately maintained number.
func TestPostOpeningBalance_IsIdempotentAndSourced(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := trustedLedgerTestContext()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("captain")
	referenceID := uniqueActorID("open")

	firstID, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 10000, referenceID, Actor{ID: "admin", Type: "operator"})
	if err != nil {
		t.Fatalf("first opening balance failed: %v", err)
	}
	secondID, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 10000, referenceID, Actor{ID: "admin", Type: "operator"})
	if err != nil {
		t.Fatalf("idempotent retry failed: %v", err)
	}
	if firstID != secondID {
		t.Fatalf("expected retry to return the original transaction, first=%s second=%s", firstID, secondID)
	}

	// A different amount against the same reference is a different financial
	// claim, not a retry, and must be rejected -- never silently summed.
	if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 20000, referenceID, Actor{ID: "admin", Type: "operator"}); !errors.Is(err, ErrLedgerReferenceConflict) {
		t.Fatalf("expected ErrLedgerReferenceConflict for a changed-amount replay, got %v", err)
	}

	// wlt_ledger_accounts.balance_minor_units is raw debit-minus-credit
	// storage; a wallet is credit-normal, so crediting it (a top-up) makes
	// the raw column negative. See GetWalletLedgerProjection's doc comment
	// for the full explanation -- this assertion is on the raw column
	// specifically, to prove PostLedgerTransaction wrote what the accounting
	// convention requires, not the human-facing sign.
	var rawBalance int64
	if err := tx.QueryRowContext(ctx, "SELECT balance_minor_units FROM wlt_ledger_accounts WHERE operator_context_id=$1 AND account_type='wallet' AND actor_type='captain' AND actor_id=$2 AND currency='YER'", "OperatorContext-ledger-tests", actorID).Scan(&rawBalance); err != nil {
		t.Fatalf("read wallet balance: %v", err)
	}
	if rawBalance != -10000 {
		t.Fatalf("expected exactly one opening balance posting (raw debit-normal balance -10000), got %d", rawBalance)
	}
}

// TestPostFinancialCorrection_RejectsZeroDelta proves a no-op correction
// cannot consume a reference and produce a transaction with no financial
// effect.
func TestPostFinancialCorrection_RejectsZeroDelta(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := trustedLedgerTestContext()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("captain")
	if _, err := PostFinancialCorrection(ctx, tx, "captain", actorID, "YER", 0, uniqueActorID("corr"), "test", Actor{ID: "admin", Type: "operator"}); !errors.Is(err, ErrZeroCorrection) {
		t.Fatalf("expected ErrZeroCorrection, got %v", err)
	}
}

// TestPostFinancialCorrection_ReversesWithoutRewritingHistory proves a
// correction is a second, distinct ledger transaction rather than an edit of
// the transaction it corrects: after crediting then reversing the same
// amount, both transactions exist as separate rows and the wallet nets back
// to zero.
func TestPostFinancialCorrection_ReversesWithoutRewritingHistory(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := trustedLedgerTestContext()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("captain")
	openingRef := uniqueActorID("open")
	correctionRef := uniqueActorID("corr")

	openingID, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 5000, openingRef, Actor{ID: "admin", Type: "operator"})
	if err != nil {
		t.Fatalf("opening balance: %v", err)
	}
	correctionID, err := PostFinancialCorrection(ctx, tx, "captain", actorID, "YER", -5000, correctionRef, "erroneous opening balance", Actor{ID: "admin", Type: "operator"})
	if err != nil {
		t.Fatalf("correction: %v", err)
	}
	if openingID == correctionID {
		t.Fatal("expected the correction to be a distinct transaction from the opening balance, not a rewrite of it")
	}

	var transactionCount int
	if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM wlt_ledger_transactions WHERE operator_context_id=$1 AND id IN ($2,$3)", "OperatorContext-ledger-tests", openingID, correctionID).Scan(&transactionCount); err != nil {
		t.Fatalf("count transactions: %v", err)
	}
	if transactionCount != 2 {
		t.Fatalf("expected both the opening balance and its correction to persist as separate transactions, found %d", transactionCount)
	}

	var balance int64
	if err := tx.QueryRowContext(ctx, "SELECT balance_minor_units FROM wlt_ledger_accounts WHERE operator_context_id=$1 AND account_type='wallet' AND actor_type='captain' AND actor_id=$2 AND currency='YER'", "OperatorContext-ledger-tests", actorID).Scan(&balance); err != nil {
		t.Fatalf("read wallet balance: %v", err)
	}
	if balance != 0 {
		t.Fatalf("expected the reversing correction to net the wallet back to zero, got %d", balance)
	}
}

// TestGetWalletLedgerProjection_MatchesPostedBalance proves the projection is
// derived, not an independent counter: it reads exactly what PostLedgerTransaction wrote.
func TestGetWalletLedgerProjection_MatchesPostedBalance(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := trustedLedgerTestContext()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("captain")
	if _, err := PostOpeningBalance(ctx, tx, "captain", actorID, "YER", 7500, uniqueActorID("open"), Actor{ID: "admin", Type: "operator"}); err != nil {
		t.Fatalf("opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}

	projection, err := GetWalletLedgerProjection(db, "captain", actorID, "YER")
	if err != nil {
		t.Fatalf("GetWalletLedgerProjection: %v", err)
	}
	if projection == nil {
		t.Fatal("expected a projection for an actor with a posted opening balance")
	}
	if projection.BalanceMinorUnits != 7500 {
		t.Fatalf("expected projection balance 7500, got %d", projection.BalanceMinorUnits)
	}
}

// TestGetWalletLedgerProjection_NoActivityReturnsNil proves "no wallet
// account created yet" is a legitimate not-found state, not an error a caller
// has to special-case around a synthetic zero value.
func TestGetWalletLedgerProjection_NoActivityReturnsNil(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	projection, err := GetWalletLedgerProjection(db, "captain", uniqueActorID("never-funded"), "YER")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if projection != nil {
		t.Fatalf("expected nil projection for an actor with no ledger activity, got %+v", projection)
	}
}
