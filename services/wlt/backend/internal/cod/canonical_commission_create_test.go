package cod

import (
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/reference"
)

func seedCommissionPaymentSession(t *testing.T, operatorContextID, status string, amount int64, currency string) (string, *sql.DB) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return "", nil
	}
	suffix := fmt.Sprint(time.Now().UnixNano())
	checkoutIntentID := "commission-checkout-" + suffix
	session, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		OperatorContextID:         operatorContextID,
		ClientID:         "commission-client-" + suffix,
		StoreID:          "commission-store-" + suffix,
		PaymentMethod:    "wallet",
		AmountMinorUnits: amount,
		Currency:         currency,
		CartSnapshotHash: "commission-cart-snapshot-" + suffix,
		IdempotencyKey:   "commission-session-" + suffix,
		CorrelationID:    "commission-session-" + suffix,
	})
	if err != nil {
		db.Close()
		t.Fatalf("create WLT payment session: %v", err)
	}
	if _, err := db.Exec(`UPDATE wlt_payment_sessions SET status=$2 WHERE operator_context_id=$1 AND id=$3`, operatorContextID, status, session.ID); err != nil {
		db.Close()
		t.Fatalf("set payment session status: %v", err)
	}
	return session.ID, db
}

func TestCanonicalOrderCommissionOverridesCallerFinancialFields(t *testing.T) {
	operatorContextID := "OperatorContext-canonical-commission-" + fmt.Sprint(time.Now().UnixNano())
	paymentSessionID, db := seedCommissionPaymentSession(t, operatorContextID, "captured", 987654, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceEvidenceID:     paymentSessionID,
		GrossBasisMinorUnits: 1,
		Currency:             "USD",
	}
	if err := bindCanonicalCommissionFinancialTruth(db, operatorContextID, &input); err != nil {
		t.Fatalf("bind canonical order commission truth: %v", err)
	}
	if input.GrossBasisMinorUnits != 987654 || input.Currency != "YER" {
		t.Fatalf("caller financial fields were not replaced: %+v", input)
	}
}

func TestCanonicalOrderCommissionRejectsCrossOperatorContextPaymentSession(t *testing.T) {
	ownerOperatorContext := "OperatorContext-owner-" + fmt.Sprint(time.Now().UnixNano())
	otherOperatorContext := "OperatorContext-other-" + fmt.Sprint(time.Now().UnixNano())
	paymentSessionID, db := seedCommissionPaymentSession(t, ownerOperatorContext, "captured", 5000, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceEvidenceID:     paymentSessionID,
	}
	err := bindCanonicalCommissionFinancialTruth(db, otherOperatorContext, &input)
	if !errors.Is(err, ErrCommissionSourceFinancialTruthMissing) {
		t.Fatalf("expected cross-OperatorContext payment truth rejection, got %v", err)
	}
}

func TestCanonicalOrderCommissionRejectsUncapturedPaymentSession(t *testing.T) {
	operatorContextID := "OperatorContext-uncaptured-" + fmt.Sprint(time.Now().UnixNano())
	paymentSessionID, db := seedCommissionPaymentSession(t, operatorContextID, "authorized", 5000, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "partner",
		SourceType:           "order",
		SourceEvidenceID:     paymentSessionID,
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
