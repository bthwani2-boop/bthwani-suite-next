package partner

import "testing"

func TestSanitizePartnerForSurfaceNeverReturnsRawPayoutIdentifiers(t *testing.T) {
	partner := Partner{
		BankAccountNumber: "raw-account",
		BankIBAN: "raw-iban",
		PayoutMobileNumber: "raw-mobile",
		MaskedAccountNumber: "*****1234",
		MaskedIBAN: "********5678",
		MaskedMobileNumber: "*******0001",
	}
	got := SanitizePartnerForSurface(partner)
	if got.BankAccountNumber != partner.MaskedAccountNumber || got.BankIBAN != partner.MaskedIBAN || got.PayoutMobileNumber != partner.MaskedMobileNumber {
		t.Fatalf("surface partner retained raw payout identifiers: %#v", got)
	}
}

func TestTransitionRequestHashBindsActorStatusAndVersion(t *testing.T) {
	input := TransitionInput{
		ToStatus: StatusSubmitted,
		Reason: "field submission",
		ActorID: "field-001",
		ActorSurface: "app-field",
	}
	first := transitionRequestHash("partner-001", input, 2)
	if first != transitionRequestHash("partner-001", input, 2) {
		t.Fatal("same transition payload produced a different hash")
	}
	input.ActorID = "field-002"
	if first == transitionRequestHash("partner-001", input, 2) {
		t.Fatal("different transition actor reused the same request hash")
	}
}

func TestNormalizeDshPayoutPreferenceMapsSurfaceVocabulary(t *testing.T) {
	cases := map[string]string{
		"bank_transfer": "bank",
		"bank": "bank",
		"mobile_wallet": "mobile_money",
		"mobile_money": "mobile_money",
		"manual": "manual",
	}
	for input, expected := range cases {
		got, ok := normalizeDshPayoutPreference(input)
		if !ok || got != expected {
			t.Fatalf("normalizeDshPayoutPreference(%q) = %q, %v; want %q, true", input, got, ok, expected)
		}
	}
	if _, ok := normalizeDshPayoutPreference("unsupported"); ok {
		t.Fatal("unsupported payout preference was accepted")
	}
}

func TestUnmaskedPayoutValueRejectsCompatibilityMasks(t *testing.T) {
	if got := unmaskedPayoutValue("*****1234"); got != "" {
		t.Fatalf("masked account was treated as raw input: %q", got)
	}
	if got := unmaskedPayoutValue(" 123456789 "); got != "123456789" {
		t.Fatalf("raw account was not normalized: %q", got)
	}
}
