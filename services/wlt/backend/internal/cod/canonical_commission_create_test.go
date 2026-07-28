package cod

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"wlt-api/internal/reference"
)

func seedCommissionPaymentSession(t *testing.T, tenantID, status string, amount int64, currency string) (string, *sql.DB) {
	t.Helper()
	db := getTestDB(t)
	if db == nil {
		return "", nil
	}
	suffix := fmt.Sprint(time.Now().UnixNano())
	checkoutIntentID := "commission-checkout-" + suffix
	session, err := reference.CreatePaymentSession(db, reference.CreatePaymentSessionInput{
		CheckoutIntentID: checkoutIntentID,
		TenantID:         tenantID,
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
	if _, err := db.Exec(`UPDATE wlt_payment_sessions SET status=$2 WHERE tenant_id=$1 AND id=$3`, tenantID, status, session.ID); err != nil {
		db.Close()
		t.Fatalf("set payment session status: %v", err)
	}
	return session.ID, db
}

func TestCanonicalOrderCommissionOverridesCallerFinancialFields(t *testing.T) {
	tenantID := "tenant-canonical-commission-" + fmt.Sprint(time.Now().UnixNano())
	paymentSessionID, db := seedCommissionPaymentSession(t, tenantID, "captured", 987654, "YER")
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
	if err := bindCanonicalCommissionFinancialTruth(db, tenantID, &input); err != nil {
		t.Fatalf("bind canonical order commission truth: %v", err)
	}
	if input.GrossBasisMinorUnits != 987654 || input.Currency != "YER" {
		t.Fatalf("caller financial fields were not replaced: %+v", input)
	}
}

func TestCanonicalOrderCommissionRejectsCrossTenantPaymentSession(t *testing.T) {
	ownerTenant := "tenant-owner-" + fmt.Sprint(time.Now().UnixNano())
	otherTenant := "tenant-other-" + fmt.Sprint(time.Now().UnixNano())
	paymentSessionID, db := seedCommissionPaymentSession(t, ownerTenant, "captured", 5000, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "captain",
		SourceType:           "order",
		SourceEvidenceID:     paymentSessionID,
	}
	err := bindCanonicalCommissionFinancialTruth(db, otherTenant, &input)
	if !errors.Is(err, ErrCommissionSourceFinancialTruthMissing) {
		t.Fatalf("expected cross-tenant payment truth rejection, got %v", err)
	}
}

func TestCanonicalOrderCommissionRejectsUncapturedPaymentSession(t *testing.T) {
	tenantID := "tenant-uncaptured-" + fmt.Sprint(time.Now().UnixNano())
	paymentSessionID, db := seedCommissionPaymentSession(t, tenantID, "authorized", 5000, "YER")
	if db == nil {
		return
	}
	defer db.Close()

	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "partner",
		SourceType:           "order",
		SourceEvidenceID:     paymentSessionID,
	}
	if err := bindCanonicalCommissionFinancialTruth(db, tenantID, &input); err == nil {
		t.Fatal("expected uncaptured payment session to be rejected")
	}
}

func TestCanonicalGenericRouteRejectsFieldVisitCommission(t *testing.T) {
	input := CreateGovernedCommissionInput{
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
	}
	if err := bindCanonicalCommissionFinancialTruth(nil, "tenant-field", &input); err == nil {
		t.Fatal("expected field visit to require the dedicated field commission route")
	}
}

var _ = context.Background
