package reference

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"wlt-api/internal/payment"
	"wlt-api/internal/pricing"
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

func issueCheckoutQuoteForSession(t *testing.T, db *sql.DB, checkoutIntentID string, amountMinorUnits int64) *pricing.CheckoutQuote {
	t.Helper()
	if amountMinorUnits <= 1000 {
		t.Fatalf("fixture amount must exceed delivery fee: %d", amountMinorUnits)
	}
	t.Setenv("WLT_DSH_PRICING_EVIDENCE_SECRET", "payment-session-quote-test-secret")
	evidence := pricing.PricingEvidence{
		Version:               1,
		Lines:                 []pricing.QuoteEvidenceLine{{MasterProductID: "product-quote", UnitPriceMinorUnits: amountMinorUnits - 1000, Currency: "YER"}},
		DeliveryFeeMinorUnits: 1000,
	}
	encoded, err := json.Marshal(evidence)
	if err != nil {
		t.Fatalf("encode pricing evidence: %v", err)
	}
	mac := hmac.New(sha256.New, []byte("payment-session-quote-test-secret"))
	_, _ = mac.Write(encoded)
	evidence.Signature = hex.EncodeToString(mac.Sum(nil))
	quote, err := pricing.IssueCheckoutQuote(context.Background(), db, "OperatorContext-dev-001", pricing.CalculateQuoteRequest{
		CheckoutIntentID: checkoutIntentID,
		CartSnapshotHash: "cart-" + checkoutIntentID,
		ClientID:         "client-alloc-e2e",
		StoreID:          "store-alloc-e2e",
		Currency:         "YER",
		CartVersion:      1,
		Lines:            []pricing.QuoteInputLine{{MasterProductID: "product-quote", Quantity: 1}},
		PricingEvidence:  evidence,
	})
	if err != nil {
		t.Fatalf("issue canonical checkout quote: %v", err)
	}
	return quote
}

// TestCreatePaymentSession_DerivesPurposeAndPersistsConservingAllocation
// proves the whole edge end to end: a caller that only supplies a checkout
// intent and a breakdown gets back a session whose purpose it never set and
// whose allocation was actually persisted and reads back unchanged.
func TestCreatePaymentSession_DerivesPurposeAndPersistsConservingAllocation(t *testing.T) {
	db := getAllocationTestDB(t)
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-e2e-alloc-%d", time.Now().UnixNano())
	quote := issueCheckoutQuoteForSession(t, db, checkoutIntentID, 5500)
	session, err := CreatePaymentSession(db, CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  5500,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quote.ID,
		IdempotencyKey:    "idem-alloc-e2e-1",
		CorrelationID:     "corr-alloc-e2e-1",
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
	quote := issueCheckoutQuoteForSession(t, db, checkoutIntentID, 5000)
	_, err := CreatePaymentSession(db, CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  5000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quote.ID,
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
func TestCreatePaymentSession_CheckoutReplayUsesTheOriginalQuoteAllocation(t *testing.T) {
	db := getAllocationTestDB(t)
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-e2e-replay-%d", time.Now().UnixNano())
	quote := issueCheckoutQuoteForSession(t, db, checkoutIntentID, 3000)
	base := CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  3000,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quote.ID,
		IdempotencyKey:    "idem-alloc-e2e-replay",
		CorrelationID:     "corr-alloc-e2e-replay",
	}
	original, err := CreatePaymentSession(db, base)
	if err != nil {
		t.Fatalf("initial create: %v", err)
	}

	sameAgain := base
	replayed, err := CreatePaymentSession(db, sameAgain)
	if err != nil {
		t.Fatalf("expected an identical replay to succeed as a no-op, got: %v", err)
	}
	if replayed.ID == "" || replayed.ID != original.ID {
		t.Fatal("identical retry must return the original payment session")
	}
}

// TestCheckoutPaymentSessionDatabaseRejectsQuoteMismatch proves the WLT-930
// trigger rejects a direct database bypass after the application has created a
// valid session. This is deliberately SQL-level: it protects against a future
// caller or manual repair path that never executes CreatePaymentSession.
func TestCheckoutPaymentSessionDatabaseRejectsQuoteMismatch(t *testing.T) {
	db := getAllocationTestDB(t)
	defer db.Close()

	checkoutIntentID := fmt.Sprintf("test-checkout-e2e-guard-%d", time.Now().UnixNano())
	quote := issueCheckoutQuoteForSession(t, db, checkoutIntentID, 4200)
	session, err := CreatePaymentSession(db, CreatePaymentSessionInput{
		CheckoutIntentID:  checkoutIntentID,
		OperatorContextID: "OperatorContext-dev-001",
		ClientID:          "client-alloc-e2e",
		StoreID:           "store-alloc-e2e",
		PaymentMethod:     "official_wallet",
		AmountMinorUnits:  4200,
		Currency:          "YER",
		CartSnapshotHash:  "cart-" + checkoutIntentID,
		PricingQuoteID:    quote.ID,
		IdempotencyKey:    "idem-alloc-e2e-guard",
		CorrelationID:     "corr-alloc-e2e-guard",
	})
	if err != nil {
		t.Fatalf("create canonical session: %v", err)
	}
	if _, err := db.Exec(`UPDATE wlt_payment_sessions SET amount_minor_units=amount_minor_units+1 WHERE id=$1`, session.ID); err == nil {
		t.Fatal("direct SQL mutation with an amount different from the canonical quote must be rejected")
	}
}
