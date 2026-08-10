package payout

import "testing"

func TestPayoutProviderDestinationValidation(t *testing.T) {
	t.Parallel()

	validBank := payoutProviderDestination{
		ID:                   "destination-bank",
		DestinationMethod:    "bank",
		BeneficiaryName:      "Partner One",
		DestinationReference: "1234567890",
	}
	if err := validBank.validateForProvider(); err != nil {
		t.Fatalf("valid bank destination rejected: %v", err)
	}

	validMobile := payoutProviderDestination{
		ID:                   "destination-mobile",
		DestinationMethod:    "mobile_money",
		BeneficiaryName:      "Captain One",
		DestinationReference: "+967700000000",
	}
	if err := validMobile.validateForProvider(); err != nil {
		t.Fatalf("valid mobile-money destination rejected: %v", err)
	}

	cases := map[string]payoutProviderDestination{
		"bank without account or iban": {
			ID: "destination-bank-empty", DestinationMethod: "bank", BeneficiaryName: "Partner One",
		},
		"mobile money without number": {
			ID: "destination-mobile-empty", DestinationMethod: "mobile_money", BeneficiaryName: "Captain One",
		},
		"manual cannot use provider": {
			ID: "destination-manual", DestinationMethod: "manual", BeneficiaryName: "Field One",
		},
		"missing beneficiary": {
			ID: "destination-no-beneficiary", DestinationMethod: "bank", DestinationReference: "1234567890",
		},
		"unsupported destination": {
			ID: "destination-unsupported", DestinationMethod: "crypto", BeneficiaryName: "Partner One",
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
		DestinationMethod:    "bank",
		BeneficiaryName:      "Partner One",
		DestinationReference: "YE001234567890",
	}
	payload := destinationProviderPayload(destination)

	checks := map[string]string{
		"id":                   destination.ID,
		"type":                 destination.DestinationMethod,
		"beneficiaryName":      destination.BeneficiaryName,
		"destinationReference": destination.DestinationReference,
	}
	for key, expected := range checks {
		if got, ok := payload[key].(string); !ok || got != expected {
			t.Fatalf("provider payload field %s mismatch: got=%v expected=%q", key, payload[key], expected)
		}
	}
}
