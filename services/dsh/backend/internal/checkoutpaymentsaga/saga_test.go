package checkoutpaymentsaga

import (
	"errors"
	"testing"

	"dsh-api/internal/checkout"
	"dsh-api/internal/wlt"
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

func TestMatchesEnforcesCheckoutCommandIdentityAgainstWltReadContract(t *testing.T) {
	input := validInput()
	readback := &wlt.PaymentSession{
		ID:                "session-1",
		ClientID:          input.ClientID,
		StoreID:           input.StoreID,
		PaymentMethod:     input.PaymentMethod,
		Status:            "reference_created",
		ProviderReference: "WLT-001",
		AmountMinorUnits:  input.AmountMinorUnits,
		Currency:          input.Currency,
	}
	if !matches(input, readback) {
		t.Fatal("readback mirroring the checkout command must match")
	}

	wrongClient := *readback
	wrongClient.ClientID = "client-other"
	if matches(input, &wrongClient) {
		t.Fatal("readback for a different client must never match the checkout command")
	}

	wrongStore := *readback
	wrongStore.StoreID = "store-other"
	if matches(input, &wrongStore) {
		t.Fatal("readback for a different store must never match the checkout command")
	}

	wrongAmount := *readback
	wrongAmount.AmountMinorUnits = input.AmountMinorUnits + 1
	if matches(input, &wrongAmount) {
		t.Fatal("readback with a different amount must never match the checkout command")
	}

	expired := *readback
	expired.Status = "expired"
	if matches(input, &expired) {
		t.Fatal("expired readback must never match the checkout command")
	}

	failed := *readback
	failed.Status = "failed"
	if matches(input, &failed) {
		t.Fatal("failed readback must never match the checkout command")
	}

	if matches(input, nil) {
		t.Fatal("nil readback must never match")
	}
}
