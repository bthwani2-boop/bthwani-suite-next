package reference

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestCreatePaymentSessionTransportRejectsCallerSelectedOperatorContext(t *testing.T) {
	var input CreatePaymentSessionInput
	err := json.Unmarshal([]byte(`{
		"checkoutIntentId":"checkout-1",
		"operatorContextId":"caller-selected-scope",
		"clientId":"client-1",
		"storeId":"store-1",
		"paymentMethod":"cod",
		"amountMinorUnits":1000,
		"currency":"YER"
	}`), &input)
	if err == nil {
		t.Fatal("caller-selected operatorContextId was accepted in payment-session JSON")
	}
	if !strings.Contains(err.Error(), "unknown field \"operatorContextId\"") {
		t.Fatalf("expected unknown-field rejection, got %v", err)
	}
}

func TestCreatePaymentSessionTransportAcceptsBusinessEvidenceWithoutOperatorContext(t *testing.T) {
	var input CreatePaymentSessionInput
	err := json.Unmarshal([]byte(`{
		"checkoutIntentId":"checkout-1",
		"clientId":"client-1",
		"storeId":"store-1",
		"paymentMethod":"cod",
		"amountMinorUnits":1000,
		"currency":"YER"
	}`), &input)
	if err != nil {
		t.Fatalf("business payment-session payload was rejected: %v", err)
	}
	if input.OperatorContextID != "" {
		t.Fatalf("transport populated server-owned operator context: %q", input.OperatorContextID)
	}
	if input.CheckoutIntentID != "checkout-1" || input.AmountMinorUnits != 1000 {
		t.Fatalf("business evidence was not decoded: %+v", input)
	}
}
