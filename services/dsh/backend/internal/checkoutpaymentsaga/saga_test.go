package checkoutpaymentsaga

import (
	"errors"
	"testing"

	"dsh-api/internal/checkout"
)

func validInput() Input {
	return Input{
		OperatorContextID: "ctx-1", CheckoutIntentID: "11111111-1111-1111-1111-111111111111", ClientID: "client-1",
		SourceVersion: 2, CommandID: "checkout-command-1", CorrelationID: "corr-1", StoreID: "store-1",
		PaymentMethod: "wallet", AmountMinorUnits: 100, Currency: "YER", CartSnapshotHash: "cart-hash", PricingQuoteID: "quote-1",
	}
}

func TestValidateInputRequiresStableIdentityAndFinancialTerms(t *testing.T) {
	input := validInput()
	if err := validateInput(input); err != nil {
		t.Fatalf("valid input rejected: %v", err)
	}
	input.CommandID = "short"
	if err := validateInput(input); err == nil {
		t.Fatal("expected short command id to be rejected")
	}
	input = validInput()
	input.AmountMinorUnits = 0
	if err := validateInput(input); err == nil {
		t.Fatal("expected zero amount to be rejected")
	}
	if !errors.Is(validateInput(input), checkout.ErrInvalid) {
		t.Fatal("expected checkout invalid error")
	}

}

func TestHashPayloadIsStableAndSensitiveToPayloadChanges(t *testing.T) {
	first := hashPayload([]byte(`{"amount":100,"currency":"YER"}`))
	second := hashPayload([]byte(`{"amount":100,"currency":"YER"}`))
	third := hashPayload([]byte(`{"amount":101,"currency":"YER"}`))
	if first != second {
		t.Fatal("identical payloads must hash identically")
	}
	if first == third {
		t.Fatal("changed payload must produce a different hash")
	}
	if len(first) != 64 {
		t.Fatalf("expected SHA-256 hex length 64, got %d", len(first))
	}
}
