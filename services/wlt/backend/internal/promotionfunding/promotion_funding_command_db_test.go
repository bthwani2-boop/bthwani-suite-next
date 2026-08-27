package promotionfunding

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func promotionFundingTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:5432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		db.Close()
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func TestTransitionCommand_ExactReplayDoesNotRepeatLedger(t *testing.T) {
	db := promotionFundingTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := fmt.Sprintf("OperatorContext-promotion-command-%d", time.Now().UnixNano())
	ctx := context.Background()
	reserveInput := ReserveInput{
		OperatorContextID:        operatorContextID,
		ExternalReference:        "external-" + operatorContextID,
		CheckoutIntentID:         "checkout-" + operatorContextID,
		CouponRedemptionID:       "redemption-" + operatorContextID,
		CouponID:                 "coupon-" + operatorContextID,
		ClientID:                 "client-promotion-command",
		PlatformFundedMinorUnits: 1000,
		TotalDiscountMinorUnits:  1000,
		Currency:                 "YER",
		IdempotencyKey:           "reserve-" + operatorContextID,
		CorrelationID:            "correlation-" + operatorContextID,
	}
	reservation, err := Reserve(ctx, db, reserveInput)
	if err != nil {
		t.Fatalf("reserve: %v", err)
	}
	transitionInput := TransitionInput{
		OperatorContextID: operatorContextID,
		OrderID:           "order-" + operatorContextID,
		IdempotencyKey:    "commit-" + operatorContextID,
		CorrelationID:     "correlation-commit-" + operatorContextID,
	}
	committed, err := Commit(ctx, db, reservation.ID, transitionInput)
	if err != nil {
		t.Fatalf("first commit: %v", err)
	}
	if committed.Status != "committed" || committed.CommitLedgerTransactionID == nil {
		t.Fatalf("first commit did not persist canonical result: %+v", committed)
	}
	ledgerID := *committed.CommitLedgerTransactionID

	replayed, err := Commit(ctx, db, reservation.ID, transitionInput)
	if err != nil {
		t.Fatalf("exact replay: %v", err)
	}
	if replayed.CommitLedgerTransactionID == nil || *replayed.CommitLedgerTransactionID != ledgerID {
		t.Fatalf("replay returned a different ledger transaction: %+v", replayed)
	}
	var ledgerCount, commandCount, eventCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_ledger_transactions WHERE id=$1`, ledgerID).Scan(&ledgerCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_promotion_funding_commands WHERE reservation_id=$1`, reservation.ID).Scan(&commandCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM wlt_promotion_funding_events WHERE reservation_id=$1 AND to_status='committed'`, reservation.ID).Scan(&eventCount); err != nil {
		t.Fatal(err)
	}
	if ledgerCount != 1 || commandCount != 1 || eventCount != 1 {
		t.Fatalf("exactly-once proof failed: ledger=%d commands=%d events=%d", ledgerCount, commandCount, eventCount)
	}

	conflicting := transitionInput
	conflicting.OrderID = "different-order-" + operatorContextID
	if _, err := Commit(ctx, db, reservation.ID, conflicting); !errors.Is(err, ErrConflict) {
		t.Fatalf("same key with changed payload error=%v, want ErrConflict", err)
	}
}

func TestTransitionCommand_ConcurrentDuplicateDoesNotDuplicateLedger(t *testing.T) {
	db := promotionFundingTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	operatorContextID := fmt.Sprintf("OperatorContext-promotion-concurrent-%d", time.Now().UnixNano())
	reserveInput := ReserveInput{
		OperatorContextID:        operatorContextID,
		ExternalReference:        "external-" + operatorContextID,
		CheckoutIntentID:         "checkout-" + operatorContextID,
		CouponRedemptionID:       "redemption-" + operatorContextID,
		CouponID:                 "coupon-" + operatorContextID,
		ClientID:                 "client-promotion-concurrent",
		PlatformFundedMinorUnits: 1000,
		TotalDiscountMinorUnits:  1000,
		Currency:                 "YER",
		IdempotencyKey:           "reserve-" + operatorContextID,
		CorrelationID:            "correlation-" + operatorContextID,
	}
	reservation, err := Reserve(context.Background(), db, reserveInput)
	if err != nil {
		t.Fatalf("reserve: %v", err)
	}
	input := TransitionInput{
		OperatorContextID: operatorContextID,
		OrderID:           "order-" + operatorContextID,
		IdempotencyKey:    "commit-" + operatorContextID,
		CorrelationID:     "correlation-commit-" + operatorContextID,
	}
	const callers = 4
	results := make(chan error, callers)
	start := make(chan struct{})
	for i := 0; i < callers; i++ {
		go func() {
			<-start
			_, callErr := Commit(context.Background(), db, reservation.ID, input)
			results <- callErr
		}()
	}
	close(start)
	for i := 0; i < callers; i++ {
		if err := <-results; err != nil {
			t.Fatalf("concurrent duplicate returned error: %v", err)
		}
	}
	var ledgerCount, eventCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_ledger_transactions WHERE operator_context_id=$1 AND reference_type='promotion_funding_reservation' AND reference_id=$2`, operatorContextID, reservation.ID).Scan(&ledgerCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_promotion_funding_events WHERE reservation_id=$1 AND to_status='committed'`, reservation.ID).Scan(&eventCount); err != nil {
		t.Fatal(err)
	}
	if ledgerCount != 1 || eventCount != 1 {
		t.Fatalf("concurrent duplicate produced duplicate effects: ledger=%d events=%d", ledgerCount, eventCount)
	}
}
