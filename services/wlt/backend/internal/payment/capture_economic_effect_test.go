package payment

import "testing"

func TestCaptureEconomicEffectUsesFinancialPurpose(t *testing.T) {
	tests := []struct {
		name        string
		purpose     string
		wantAccount string
		wantActor   string
	}{
		{name: "customer topup", purpose: string(PurposeCustomerTopUp), wantAccount: "wallet", wantActor: "client"},
		{name: "captain topup", purpose: string(PurposeCaptainTopUp), wantAccount: "wallet", wantActor: "captain"},
		{name: "order payment", purpose: string(PurposeOrderPayment), wantAccount: "platform_payable", wantActor: "wlt"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lines, actor, err := captureEconomicEffect(&PaymentSession{
				ClientID:         "client-1",
				AmountMinorUnits: 125,
				Currency:         "YER",
				FinancialPurpose: tt.purpose,
			})
			if err != nil {
				t.Fatalf("captureEconomicEffect returned error: %v", err)
			}
			if len(lines) != 2 || lines[0].AccountType != "provider_clearing" || lines[1].AccountType != tt.wantAccount {
				t.Fatalf("unexpected lines: %+v", lines)
			}
			if actor.Type != "service" && actor.Type != tt.wantActor {
				t.Fatalf("unexpected actor: %+v", actor)
			}
			if tt.wantActor != "wlt" && actor.Type != tt.wantActor {
				t.Fatalf("unexpected top-up actor: %+v", actor)
			}
		})
	}
}

func TestCaptureEconomicEffectFailsClosedForUnknownPurpose(t *testing.T) {
	if _, _, err := captureEconomicEffect(&PaymentSession{AmountMinorUnits: 1, Currency: "YER", FinancialPurpose: "unknown"}); err == nil {
		t.Fatal("expected unknown FinancialPurpose to fail closed")
	}
}
