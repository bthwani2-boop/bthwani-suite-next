package payment

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"wlt-api/internal/testsupport"
)

func seedCheckoutSession(t *testing.T, db *sql.DB, checkoutIntentID, status, providerReference string, amountMinorUnits int64, captured bool) string {
	t.Helper()
	var capturedAt *time.Time
	if captured {
		now := time.Now().UTC()
		capturedAt = &now
	}
	sessionID, err := testsupport.SeedCanonicalCheckoutPaymentSession(context.Background(), db, testsupport.CheckoutPaymentSession{
		OperatorContextID: "OperatorContext-test",
		CheckoutIntentID:  checkoutIntentID,
		ClientID:          "client-test",
		StoreID:           "store-test",
		PaymentMethod:     "official_wallet",
		Status:            status,
		ProviderReference: providerReference,
		AmountMinorUnits:  amountMinorUnits,
		Currency:          "YER",
		FinancialPurpose:  "order_payment",
		CapturedAt:        capturedAt,
	})
	if err != nil {
		t.Fatalf("seed canonical checkout payment session: %v", err)
	}
	return sessionID
}
