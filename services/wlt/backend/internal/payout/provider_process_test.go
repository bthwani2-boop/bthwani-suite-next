package payout

import "testing"

func TestPayoutProviderDestinationValidation(t *testing.T) {
	t.Parallel()

	validBank := payoutProviderDestination{
		ID:                   "destination-bank",
		SettlementPreference: "bank",
		BeneficiaryName:      "Partner One",
		AccountNumber:        "1234567890",
	}
	if err := validBank.validateForProvider(); err != nil {
		t.Fatalf("valid bank destination rejected: %v", err)
	}

	validMobile := payoutProviderDestination{
		ID:                   "destination-mobile",
		SettlementPreference: "mobile_money",
		BeneficiaryName:      "Captain One",
		MobileNumber:         "+967700000000",
	}
	if err := validMobile.validateForProvider(); err != nil {
		t.Fatalf("valid mobile-money destination rejected: %v", err)
	}

	cases := map[string]payoutProviderDestination{
		"bank without account or iban": {
			ID: "destination-bank-empty", SettlementPreference: "bank", BeneficiaryName: "Partner One",
		},
		"mobile money without number": {
			ID: "destination-mobile-empty", SettlementPreference: "mobile_money", BeneficiaryName: "Captain One",
		},
		"manual cannot use provider": {
			ID: "destination-manual", SettlementPreference: "manual", BeneficiaryName: "Field One",
		},
		"missing beneficiary": {
			ID: "destination-no-beneficiary", SettlementPreference: "bank", AccountNumber: "1234567890",
		},
		"unsupported destination": {
			ID: "destination-unsupported", SettlementPreference: "crypto", BeneficiaryName: "Partner One",
		},
	}

	for name, destination := range cases {
		name, destination := name, destination
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if err := destination.validateForProvider(); err == nil {
				t.Fatal("expected destination to be rejected")
			}
		})
	}
}

func TestDestinationProviderPayloadBindsRawProviderFields(t *testing.T) {
	t.Parallel()

	destination := payoutProviderDestination{
		ID:                   "destination-1",
		SettlementPreference: "bank",
		BeneficiaryName:      "Partner One",
		BankName:             "Bank",
		BankBranch:           "Branch",
		AccountNumber:        "1234567890",
		IBAN:                 "YE001234567890",
		MobileNumber:         "+967700000000",
	}
	payload := destinationProviderPayload(destination)

	checks := map[string]string{
		"id":                 destination.ID,
		"type":               destination.SettlementPreference,
		"beneficiaryName":    destination.BeneficiaryName,
		"bankName":           destination.BankName,
		"bankBranch":         destination.BankBranch,
		"accountNumber":      destination.AccountNumber,
		"iban":               destination.IBAN,
		"payoutMobileNumber": destination.MobileNumber,
	}
	for key, expected := range checks {
		if got, ok := payload[key].(string); !ok || got != expected {
			t.Fatalf("provider payload field %s mismatch: got=%v expected=%q", key, payload[key], expected)
		}
	}
}
