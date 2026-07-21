package payout

import "testing"

func validGovernedPayoutInput() UpsertPayoutDestinationInput {
	return UpsertPayoutDestinationInput{
		PartnerID:                     "prt-001",
		BeneficiaryName:               "Partner Owner",
		BankName:                      "Test Bank",
		AccountNumber:                 "123456789",
		SettlementPreference:          "bank",
		BankAccountHolderMatchesOwner: true,
		CreatedByActorID:              "field-001",
	}
}

func TestValidatePayoutDestinationInputRequiresModeSpecificDestination(t *testing.T) {
	bank := validGovernedPayoutInput()
	bank.AccountNumber = ""
	if err := validatePayoutDestinationInput(bank); err == nil {
		t.Fatal("expected bank settlement without account number to fail")
	}

	mobile := validGovernedPayoutInput()
	mobile.SettlementPreference = "mobile_money"
	mobile.BankName = ""
	mobile.AccountNumber = ""
	mobile.PayoutMobileNumber = ""
	if err := validatePayoutDestinationInput(mobile); err == nil {
		t.Fatal("expected mobile-money settlement without mobile number to fail")
	}

	mobile.PayoutMobileNumber = "+967770000001"
	if err := validatePayoutDestinationInput(mobile); err != nil {
		t.Fatalf("expected complete mobile-money destination to pass: %v", err)
	}
}

func TestPayoutDestinationRequestHashIsStableAndPayloadBound(t *testing.T) {
	first := validGovernedPayoutInput()
	second := validGovernedPayoutInput()
	if got, want := payoutDestinationRequestHash(first), payoutDestinationRequestHash(second); got != want {
		t.Fatalf("same payout payload produced different request hashes: %q != %q", got, want)
	}
	second.AccountNumber = "987654321"
	if payoutDestinationRequestHash(first) == payoutDestinationRequestHash(second) {
		t.Fatal("different payout account reused the same request hash")
	}
}

func TestNormalizePayoutDestinationInputTrimsBoundaryValues(t *testing.T) {
	input := validGovernedPayoutInput()
	input.PartnerID = "  prt-001  "
	input.BeneficiaryName = "  Partner Owner  "
	input.AccountNumber = "  123456789  "
	normalizePayoutDestinationInput(&input)
	if input.PartnerID != "prt-001" || input.BeneficiaryName != "Partner Owner" || input.AccountNumber != "123456789" {
		t.Fatalf("payout input was not normalized: %#v", input)
	}
}
