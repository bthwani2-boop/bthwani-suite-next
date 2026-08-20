package cod

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/testsupport"
)

func seedCommissionPaymentSession(t *testing.T, operatorContextID, status string, amount int64, currency string) (string, *sql.DB) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return "", nil
	}
	suffix := fmt.Sprint(time.Now().UnixNano())
	checkoutIntentID := "commission-checkout-" + suffix
	_, err := testsupport.SeedCanonicalCheckoutPaymentSession(context.Background(), db, testsupport.CheckoutPaymentSession{
		OperatorContextID: operatorContextID,
		CheckoutIntentID:  checkoutIntentID,
		ClientID:          "commission-client-" + suffix,
		StoreID:           "commission-store-" + suffix,
		PaymentMethod:     "wallet",
		Status:            status,
		AmountMinorUnits:  amount,
		Currency:          currency,
		FinancialPurpose:  "order_payment",
	})
	if err != nil {
		db.Close()
		t.Fatalf("create WLT payment session: %v", err)
	}
	return checkoutIntentID, db
}

func TestCanonicalOrderCommissionOverridesCallerFinancialFields(t *testing.T) {
	operatorContextID := "OperatorContext-canonical-commission-" + fmt.Sprint(time.Now().UnixNano())
	checkoutIntentID, db := seedCommissionPaymentSession(t, operatorContextID, "captured", 987654, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceEvidenceID:     checkoutIntentID,
		GrossBasisMinorUnits: 1,
		Currency:             "USD",
	}
	if err := bindCanonicalCommissionFinancialTruth(db, operatorContextID, &input); err != nil {
		t.Fatalf("bind canonical order commission truth: %v", err)
	}
	if input.GrossBasisMinorUnits != 987654 || input.Currency != "YER" {
		t.Fatalf("caller financial fields were not replaced: %+v", input)
	}
	if input.SourceEvidenceHash == "" || input.SourceEvidenceID != checkoutIntentID {
		t.Fatalf("canonical payment evidence was not bound: %+v", input)
	}
}

func TestCanonicalOrderCommissionRejectsCrossOperatorContextPaymentSession(t *testing.T) {
	ownerOperatorContext := "OperatorContext-owner-" + fmt.Sprint(time.Now().UnixNano())
	otherOperatorContext := "OperatorContext-other-" + fmt.Sprint(time.Now().UnixNano())
	checkoutIntentID, db := seedCommissionPaymentSession(t, ownerOperatorContext, "captured", 5000, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceEvidenceID:     checkoutIntentID,
	}
	err := bindCanonicalCommissionFinancialTruth(db, otherOperatorContext, &input)
	if !errors.Is(err, ErrCommissionSourceFinancialTruthMissing) {
		t.Fatalf("expected cross-OperatorContext payment truth rejection, got %v", err)
	}
}

func TestCanonicalOrderCommissionRejectsUncapturedPaymentSession(t *testing.T) {
	operatorContextID := "OperatorContext-uncaptured-" + fmt.Sprint(time.Now().UnixNano())
	checkoutIntentID, db := seedCommissionPaymentSession(t, operatorContextID, "authorized", 5000, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "partner",
		SourceType:           "order",
		SourceEvidenceID:     checkoutIntentID,
	}
	if err := bindCanonicalCommissionFinancialTruth(db, operatorContextID, &input); err == nil {
		t.Fatal("expected uncaptured payment session to be rejected")
	}
}

func TestCanonicalGenericRouteRejectsFieldVisitCommission(t *testing.T) {
	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
	}
	if err := bindCanonicalCommissionFinancialTruth(nil, "OperatorContext-field", &input); err == nil {
		t.Fatal("expected field visit to require the dedicated field commission route")
	}
}
