package payment

import "testing"

func TestCaptureEconomicEffectUsesFinancialPurpose(t *testing.T) {
	tests := []struct {
		name            string
		purpose         string
		wantAccount     string
		wantActor       string
		wantTransaction string
	}{
		{name: "customer topup", purpose: string(PurposeCustomerTopUp), wantAccount: "wallet", wantActor: "client", wantTransaction: "cash_in_topup"},
		{name: "captain topup", purpose: string(PurposeCaptainTopUp), wantAccount: "wallet", wantActor: "captain", wantTransaction: "cash_in_topup"},
		{name: "order payment", purpose: string(PurposeOrderPayment), wantAccount: "platform_payable", wantActor: "wlt", wantTransaction: "payment_captured"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			effect, err := captureEconomicEffect(&PaymentSession{
				ID:               "session-1",
				ClientID:         "client-1",
				AmountMinorUnits: 125,
				Currency:         "YER",
				FinancialPurpose: tt.purpose,
			})
			if err != nil {
				t.Fatalf("captureEconomicEffect returned error: %v", err)
			}
			if len(effect.Lines) != 2 || effect.Lines[0].AccountType != "provider_clearing" || effect.Lines[1].AccountType != tt.wantAccount {
				t.Fatalf("unexpected lines: %+v", effect.Lines)
			}
			if effect.Actor.Type != "service" && effect.Actor.Type != tt.wantActor {
				t.Fatalf("unexpected actor: %+v", effect.Actor)
			}
			if tt.wantActor != "wlt" && effect.Actor.Type != tt.wantActor {
				t.Fatalf("unexpected top-up actor: %+v", effect.Actor)
			}
			if effect.TransactionType != tt.wantTransaction || effect.ReferenceType != "payment_session" || effect.ReferenceID != "session-1" {
				t.Fatalf("unexpected canonical transaction identity: %+v", effect)
			}
		})
	}
}

func TestCaptureEconomicEffectFailsClosedForUnknownPurpose(t *testing.T) {
	if _, err := captureEconomicEffect(&PaymentSession{AmountMinorUnits: 1, Currency: "YER", FinancialPurpose: "unknown"}); err == nil {
		t.Fatal("expected unknown FinancialPurpose to fail closed")
	}
}
