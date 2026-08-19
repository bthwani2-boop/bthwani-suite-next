package refund

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"wlt-api/internal/testsupport"
)

func getTestDB(t *testing.T) *sql.DB {
	t.Helper()
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

func insertTestSession(t *testing.T, db *sql.DB, status string, amount int64, currency string) string {
	t.Helper()
	checkoutIntentID := fmt.Sprintf("test-checkout-refund-%d", time.Now().UnixNano())
	var capturedAt *time.Time
	if status == "captured" || status == "cod_finalized" {
		now := time.Now().UTC()
		capturedAt = &now
	}
	sessionID, err := testsupport.SeedCanonicalCheckoutPaymentSession(context.Background(), db, testsupport.CheckoutPaymentSession{
		OperatorContextID: "OperatorContext-test",
		CheckoutIntentID:  checkoutIntentID,
		ClientID:          "client-test",
		StoreID:           "store-test",
		PaymentMethod:     "wallet",
		Status:            status,
		ProviderReference: "card-ref-001",
		AmountMinorUnits:  amount,
		Currency:          currency,
		FinancialPurpose:  "order_payment",
		CapturedAt:        capturedAt,
	})
	if err != nil {
		t.Fatalf("seed canonical payment session: %v", err)
	}
	return sessionID
}
