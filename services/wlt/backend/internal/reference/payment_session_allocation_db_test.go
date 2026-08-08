package reference

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"wlt-api/internal/payment"
)

func getAllocationTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("open test db: %v", err)
		}
		t.Skipf("skipping DB test, could not open database: %v", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		if requireDB {
			t.Fatalf("ping test db: %v", err)
		}
		t.Skipf("skipping DB test, database not reachable: %v", err)
	}
	return db
}

// TestCreatePaymentSession_DerivesPurposeAndPersistsConservingAllocation
// proves the whole edge end to end: a caller that only supplies a checkout
// intent and a breakdown gets back a session whose purpose it never set and
// whose allocation was actually persisted and reads back unchanged.
func TestCreatePaymentSession_DerivesPurposeAndPersistsConservingAllocation(t *testing.T) {
	db := getAllocationTestDB(t)
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-e2e-alloc-%d", time.Now().UnixNano())
	session, err := CreatePaymentSession(db, CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  5500,
		Currency:          "YER",
		IdempotencyKey:    "idem-alloc-e2e-1",
		CorrelationID:     "corr-alloc-e2e-1",
		Allocation: []payment.AllocationLine{
			{Component: payment.AllocationGoodsSubtotal, AmountMinorUnits: 4500},
			{Component: payment.AllocationDeliveryFee, AmountMinorUnits: 1000},
		},
	})
	if err != nil {
		t.Fatalf("CreatePaymentSession: %v", err)
	}
	if session.FinancialPurpose != string(payment.PurposeOrderPayment) {
		t.Fatalf("expected server-derived purpose %q, got %q", payment.PurposeOrderPayment, session.FinancialPurpose)
	}
	if len(session.Allocation) != 2 {
		t.Fatalf("expected 2 allocation components on create, got %d", len(session.Allocation))
	}

	reread, err := GetPaymentSession(db, session.ID)
	if err != nil {
		t.Fatalf("GetPaymentSession: %v", err)
	}
	if reread == nil {
		t.Fatal("expected session to be readable back")
	}
	if len(reread.Allocation) != 2 {
		t.Fatalf("expected persisted allocation to read back with 2 components, got %d", len(reread.Allocation))
	}
	var total int64
	for _, line := range reread.Allocation {
		total += line.AmountMinorUnits
	}
	if total != reread.AmountMinorUnits {
		t.Fatalf("persisted allocation sums to %d but session amount is %d", total, reread.AmountMinorUnits)
	}
}

// TestCreatePaymentSession_RejectsNonConservingAllocation proves the reject
// happens before any row is written -- ValidatePaymentAllocation runs before
// the transaction starts, so a bad breakdown never reaches the database.
func TestCreatePaymentSession_RejectsNonConservingAllocation(t *testing.T) {
	db := getAllocationTestDB(t)
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-e2e-badalloc-%d", time.Now().UnixNano())
	_, err := CreatePaymentSession(db, CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  5000,
		Currency:          "YER",
		IdempotencyKey:    "idem-alloc-e2e-bad",
		CorrelationID:     "corr-alloc-e2e-bad",
		Allocation: []payment.AllocationLine{
			{Component: payment.AllocationGoodsSubtotal, AmountMinorUnits: 4000},
		},
	})
	if err == nil {
		t.Fatal("expected a non-conserving allocation to be rejected, got nil error")
	}

	existing, lookupErr := getPaymentSessionByCheckoutIntent(db, "OperatorContext-dev-001", checkoutIntentID)
	if lookupErr != nil {
		t.Fatalf("lookup after rejected create: %v", lookupErr)
	}
	if existing != nil {
		t.Fatal("a rejected allocation must not leave a session behind")
	}
}

// TestCreatePaymentSession_ReplayWithDifferentAllocationConflicts proves the
// allocation is part of the idempotency identity: replaying the same source
// with a different breakdown is a different financial claim, not a retry.
func TestCreatePaymentSession_ReplayWithDifferentAllocationConflicts(t *testing.T) {
	db := getAllocationTestDB(t)
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-e2e-replay-%d", time.Now().UnixNano())
	base := CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  3000,
		Currency:          "YER",
		IdempotencyKey:    "idem-alloc-e2e-replay",
		CorrelationID:     "corr-alloc-e2e-replay",
		Allocation: []payment.AllocationLine{
			{Component: payment.AllocationGoodsSubtotal, AmountMinorUnits: 3000},
		},
	}
	if _, err := CreatePaymentSession(db, base); err != nil {
		t.Fatalf("initial create: %v", err)
	}

	replay := base
	replay.Allocation = []payment.AllocationLine{
		{Component: payment.AllocationGoodsSubtotal, AmountMinorUnits: 2000},
		{Component: payment.AllocationDeliveryFee, AmountMinorUnits: 1000},
	}
	_, err := CreatePaymentSession(db, replay)
	if err != ErrIdempotencyConflict {
		t.Fatalf("expected ErrIdempotencyConflict for a differing allocation replay, got: %v", err)
	}

	sameAgain := base
	if _, err := CreatePaymentSession(db, sameAgain); err != nil {
		t.Fatalf("expected an identical replay to succeed as a no-op, got: %v", err)
	}
}
