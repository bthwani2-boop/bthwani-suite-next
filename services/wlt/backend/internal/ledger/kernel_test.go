package ledger

import (
	"context"
	"database/sql"
	"errors"
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
	_, err = PostLedgerTransaction(ctx, tx, "test_capture", "test", uniqueActorID("ref"), lines, Actor{ID: "system", Type: "system"})
	if !errors.Is(err, ErrUnbalancedTransaction) {
		t.Fatalf("expected ErrUnbalancedTransaction, got %v", err)
	}
}

func TestPostLedgerTransaction_RejectsTooFewLines(t *testing.T) {
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
	if _, err := PostLedgerTransaction(ctx, tx, "test_capture", "test", uniqueActorID("ref"), lines, Actor{ID: "system", Type: "system"}); err == nil {
		t.Fatal("expected single-line transaction to be rejected")
	}
}

func TestPostLedgerTransaction_BalancedMultiLineTransaction(t *testing.T) {
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

	partnerID := uniqueActorID("partner")
	lines := []LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: 5000, Currency: "YER"},
		{AccountType: "wallet", ActorType: "partner", ActorID: partnerID, DebitCredit: "credit", AmountMinorUnits: 4000, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 1000, Currency: "YER"},
	}
	txnID, err := PostLedgerTransaction(ctx, tx, "test_capture", "payment_session", uniqueActorID("session"), lines, Actor{ID: "system", Type: "system"})
	if err != nil {
		t.Fatalf("expected balanced multi-line transaction to succeed: %v", err)
	}

	var lineCount int
	if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM wlt_ledger_lines WHERE ledger_transaction_id = $1", txnID).Scan(&lineCount); err != nil {
		t.Fatalf("count lines: %v", err)
	}
	if lineCount != 3 {
		t.Fatalf("expected 3 ledger lines, got %d", lineCount)
	}
}

func TestPostLedgerTransaction_IdempotentRetryDoesNotMoveBalanceTwice(t *testing.T) {
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
	referenceID := uniqueActorID("payment")
	lines := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 5000, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 5000, Currency: "YER"},
	}
	firstID, err := PostLedgerTransaction(ctx, tx, "test_idempotent", "payment_session", referenceID, lines, Actor{ID: "system", Type: "system"})
	if err != nil {
		t.Fatalf("first post failed: %v", err)
	}
	secondID, err := PostLedgerTransaction(ctx, tx, "test_idempotent", "payment_session", referenceID, lines, Actor{ID: "system", Type: "system"})
	if err != nil {
		t.Fatalf("identical retry failed: %v", err)
	}
	if firstID != secondID {
		t.Fatalf("expected retry to return original transaction ID: first=%s second=%s", firstID, secondID)
	}

	var walletBalance int64
	if err := tx.QueryRowContext(ctx, "SELECT balance_minor_units FROM wlt_ledger_accounts WHERE account_type = 'wallet' AND actor_type = 'client' AND actor_id = $1", actorID).Scan(&walletBalance); err != nil {
		t.Fatalf("read wallet balance: %v", err)
	}
	if walletBalance != 5000 {
		t.Fatalf("expected one posting only, wallet balance=%d", walletBalance)
	}
}

func TestPostLedgerTransaction_RejectsChangedRetryPayload(t *testing.T) {
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
	referenceID := uniqueActorID("payment")
	original := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 5000, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 5000, Currency: "YER"},
	}
	if _, err := PostLedgerTransaction(ctx, tx, "test_conflict", "payment_session", referenceID, original, Actor{ID: "system", Type: "system"}); err != nil {
		t.Fatalf("first post failed: %v", err)
	}
	changed := []LedgerLine{
		{AccountType: "wallet", ActorType: "client", ActorID: actorID, DebitCredit: "debit", AmountMinorUnits: 4900, Currency: "YER"},
		{AccountType: "platform_revenue", DebitCredit: "credit", AmountMinorUnits: 4900, Currency: "YER"},
	}
	if _, err := PostLedgerTransaction(ctx, tx, "test_conflict", "payment_session", referenceID, changed, Actor{ID: "system", Type: "system"}); !errors.Is(err, ErrLedgerReferenceConflict) {
		t.Fatalf("expected ErrLedgerReferenceConflict, got %v", err)
	}
}

// TestPostLedgerTransaction_ConcurrentPostsDontLoseUpdates fires many
// concurrent balanced transactions against the same wallet account and proves
// the atomic UPDATE ... RETURNING pattern does not lose updates.
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
				_, err = PostLedgerTransaction(ctx, tx, "test_concurrent", "test", fmt.Sprintf("ref-%d-%d-%d", time.Now().UnixNano(), idx, i), lines, Actor{ID: "system", Type: "system"})
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
	if err := db.QueryRowContext(ctx, "SELECT balance_minor_units FROM wlt_ledger_accounts WHERE account_type = 'wallet' AND actor_type = 'captain' AND actor_id = $1", actorID).Scan(&finalBalance); err != nil {
		t.Fatalf("read final balance: %v", err)
	}
	expected := int64(goroutines * perGoroutine * 100)
	if finalBalance != expected {
		t.Fatalf("expected final balance %d, got %d (lost update under concurrency)", expected, finalBalance)
	}
}
