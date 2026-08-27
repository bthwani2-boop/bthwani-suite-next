package specialrequests

import (
	"encoding/json"
	"errors"
	"testing"
	"time"

	"dsh-api/internal/wlt"
)

func TestSagaPayloadHashIsStableAndInputBound(t *testing.T) {
	first := []byte(`{"commandId":"cmd-12345678","amount":100}`)
	second := []byte(`{"commandId":"cmd-12345678","amount":100}`)
	third := []byte(`{"commandId":"cmd-12345678","amount":101}`)
	if sagaPayloadHash(first) != sagaPayloadHash(second) {
		t.Fatal("expected identical payloads to have identical hashes")
	}
	if sagaPayloadHash(first) == sagaPayloadHash(third) {
		t.Fatal("expected changed payload to have a different hash")
	}
}

func TestValidateSagaIdentityRequiresStableCommandID(t *testing.T) {
	if err := validateSagaIdentity("operator-1", "request-1", "short"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected short command id to be rejected, got %v", err)
	}
	if err := validateSagaIdentity("operator-1", "request-1", "cmd-12345678"); err != nil {
		t.Fatalf("expected valid command id, got %v", err)
	}
}

func TestSagaPayloadRoundTripPreservesCommandIdentity(t *testing.T) {
	input := QuoteSagaInput{OperatorContextID: "operator-1", SpecialRequestID: "request-1", ClientID: "client-1", CommandID: "cmd-12345678", PolicyID: "policy-1", ProposedAmountMinorUnits: 1250, ProposedCurrency: "YER", ProposalReason: "approved quote"}
	payload, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	var decoded QuoteSagaInput
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.CommandID != input.CommandID || decoded.ProposedAmountMinorUnits != input.ProposedAmountMinorUnits {
		t.Fatalf("payload round trip changed command input: %#v", decoded)
	}
}

func TestQuoteReadbackMustMatchDurableCommand(t *testing.T) {
	input := QuoteSagaInput{OperatorContextID: "operator-1", SpecialRequestID: "request-1", ClientID: "client-1", PolicyID: "policy-1", ProposedAmountMinorUnits: 1250, ProposedCurrency: "YER"}
	valid := &wlt.SpecialRequestQuote{ID: "quote-1", OperatorContextID: input.OperatorContextID, SpecialRequestID: input.SpecialRequestID, ClientID: input.ClientID, PolicyID: input.PolicyID, ProposedAmountMinorUnits: input.ProposedAmountMinorUnits, ProposedCurrency: input.ProposedCurrency, Status: "active", ExpiresAt: time.Now().Add(time.Hour)}
	if !quoteMatches(input, valid) {
		t.Fatal("expected matching WLT quote readback to be accepted")
	}
	valid.ProposedAmountMinorUnits++
	if quoteMatches(input, valid) {
		t.Fatal("expected amount drift in WLT quote readback to be rejected")
	}
}

func TestPaymentReadbackMustMatchDurableCommand(t *testing.T) {
	input := PaymentSessionSagaInput{StoreID: "dsh-special-requests", PaymentMethod: "official_wallet", AmountMinorUnits: 1250, Currency: "YER"}
	valid := &wlt.PaymentSessionDetail{ID: "session-1", StoreID: input.StoreID, PaymentMethod: input.PaymentMethod, AmountMinorUnits: input.AmountMinorUnits, Currency: input.Currency, Status: "created"}
	if !paymentMatches(input, valid) {
		t.Fatal("expected matching WLT payment readback to be accepted")
	}
	valid.Currency = "SAR"
	if paymentMatches(input, valid) {
		t.Fatal("expected currency drift in WLT payment readback to be rejected")
	}
}
