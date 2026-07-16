package ledger

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func uniqueActorID(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

func TestPostLedgerTransaction_RejectsUnbalanced(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("client")
	lines := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 1000, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 999, Currency: "YER"},
	}
	_, err = PostLedgerTransaction(ctx, tx, "test_capture", "test", "ref-1", lines, Actor{ID: "system", Type: "system"})
	if err == nil {
		t.Fatalf("expected unbalanced transaction to be rejected")
	}
}

func TestPostLedgerTransaction_RejectsWrongLineCount(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("client")
	lines := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 1000, Currency: "YER"},
	}
	_, err = PostLedgerTransaction(ctx, tx, "test_capture", "test", "ref-2", lines, Actor{ID: "system", Type: "system"})
	if err == nil {
		t.Fatalf("expected single-line transaction to be rejected")
	}
}

func TestPostLedgerTransaction_BalancedTransactionUpdatesAccountBalances(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	defer tx.Rollback()

	actorID := uniqueActorID("client")
	lines := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 5000, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 5000, Currency: "YER"},
	}
	txnID, err := PostLedgerTransaction(ctx, tx, "test_capture", "test", "ref-3", lines, Actor{ID: "system", Type: "system"})
	if err != nil {
		t.Fatalf("expected balanced transaction to succeed: %v", err)
	}
	if txnID == "" {
		t.Fatalf("expected a non-empty transaction id")
	}

	var lineCount int
	if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1", txnID).Scan(&lineCount); err != nil {
		t.Fatalf("count lines: %v", err)
	}
	if lineCount != 2 {
		t.Fatalf("expected 2 ledger lines, got %d", lineCount)
	}

	var walletBalance int64
	err = tx.QueryRowContext(ctx, "SELECT balance_minor_units FROM wlt_ledger_accounts WHERE account_type = 'wallet' AND actor_type = 'client' AND actor_id = $1", actorID).Scan(&walletBalance)
	if err != nil {
		t.Fatalf("read wallet account balance: %v", err)
	}
	if walletBalance != 5000 {
		t.Fatalf("expected wallet account balance 5000, got %d", walletBalance)
	}
}

// TestPostLedgerTransaction_ConcurrentPostsDontLoseUpdates fires many
// concurrent balanced transactions against the same wallet account (each in
// its own connection/transaction, committed independently) and asserts the
// final balance is the sum of every transaction, not a last-write-wins
// result -- proving the atomic UPDATE ... RETURNING pattern doesn't drop
// concurrent updates the way a read-then-write would.
func TestPostLedgerTransaction_ConcurrentPostsDontLoseUpdates(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	db.SetMaxOpenConns(20)
	ctx := context.Background()
	actorID := uniqueActorID("captain")

	const goroutines = 10
	const perGoroutine = 5
	var wg sync.WaitGroup
	errs := make(chan error, goroutines*perGoroutine)

	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			for i := 0; i < perGoroutine; i++ {
				tx, err := db.BeginTx(ctx, nil)
				if err != nil {
					errs <- err
					continue
				}
				lines := []LedgerLine{
					{AccountType: "wallet", ActorType: "captain", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 100, Currency: "YER"},
					{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 100, Currency: "YER"},
				}
				_, err = PostLedgerTransaction(ctx, tx, "test_concurrent", "test", fmt.Sprintf("ref-%d-%d", idx, i), lines, Actor{ID: "system", Type: "system"})
				if err != nil {
					tx.Rollback()
					errs <- err
					continue
				}
				if err := tx.Commit(); err != nil {
					errs <- err
				}
			}
		}(g)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatalf("concurrent post failed: %v", err)
	}

	var finalBalance int64
	err := db.QueryRowContext(ctx, "SELECT balance_minor_units FROM wlt_ledger_accounts WHERE account_type = 'wallet' AND actor_type = 'captain' AND actor_id = $1", actorID).Scan(&finalBalance)
	if err != nil {
		t.Fatalf("read final balance: %v", err)
	}
	expected := int64(goroutines * perGoroutine * 100)
	if finalBalance != expected {
		t.Fatalf("expected final balance %d, got %d (lost update under concurrency)", expected, finalBalance)
	}
}
