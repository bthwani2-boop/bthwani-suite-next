package payout

import "testing"

func int64Pointer(value int64) *int64 {
	return &value
}

func TestIsSHA256AcceptsOnlyLowercaseCanonicalHex(t *testing.T) {
	valid := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	if !isSHA256(valid) {
		t.Fatal("valid lowercase SHA-256 was rejected")
	}
	for _, value := range []string{
		"", valid[:63], valid + "0", "0123456789ABCDEF0123456789abcdef0123456789abcdef0123456789abcdef", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg",
	} {
		if isSHA256(value) {
			t.Fatalf("invalid SHA-256 %q was accepted", value)
		}
	}
}

func TestNormalizeGovernedOwner(t *testing.T) {
	t.Parallel()

	for _, actorType := range []string{"partner", "captain", "field"} {
		actorType := actorType
		t.Run(actorType, func(t *testing.T) {
			t.Parallel()
			gotType, gotID, err := normalizeGovernedOwner("  "+actorType+"  ", " actor-1 ")
			if err != nil {
				t.Fatalf("normalizeGovernedOwner returned error: %v", err)
			}
			if gotType != actorType || gotID != "actor-1" {
				t.Fatalf("unexpected normalized owner: type=%q id=%q", gotType, gotID)
			}
		})
	}

	for name, input := range map[string]struct {
		actorType string
		actorID   string
	}{
		"client is not a payout owner": {actorType: "client", actorID: "client-1"},
		"missing actor type":           {actorType: "", actorID: "actor-1"},
		"missing actor id":             {actorType: "partner", actorID: ""},
	} {
		name, input := name, input
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if _, _, err := normalizeGovernedOwner(input.actorType, input.actorID); err == nil {
				t.Fatal("expected invalid payout owner to be rejected")
			}
		})
	}
}

func TestGovernedPayoutHashBindsOperatorContextDestinationAndIntent(t *testing.T) {
	t.Parallel()

	base := governedCreatePayoutInput{
		BeneficiaryActorID:   "field-1",
		BeneficiaryActorType: "field",
		AmountMode:           payoutAmountModeSpecified,
		AmountMinorUnits:     int64Pointer(12500),
		Currency:             "YER",
	}
	baseHash := governedPayoutHash("OperatorContext-main", base)
	if baseHash == "" {
		t.Fatal("expected non-empty payout hash")
	}
	if governedPayoutHash("OperatorContext-other", base) == baseHash {
		t.Fatal("hash did not change across OperatorContexts")
	}

	cases := map[string]governedCreatePayoutInput{
		"different actor id": {
			BeneficiaryActorID: "field-2", BeneficiaryActorType: "field", AmountMode: payoutAmountModeSpecified, AmountMinorUnits: int64Pointer(12500), Currency: "YER",
		},
		"different actor type": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "captain", AmountMode: payoutAmountModeSpecified, AmountMinorUnits: int64Pointer(12500), Currency: "YER",
		},
		"different amount mode": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "field", AmountMode: payoutAmountModeFullAvailable, Currency: "YER",
		},
		"different amount": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "field", AmountMode: payoutAmountModeSpecified, AmountMinorUnits: int64Pointer(12600), Currency: "YER",
		},
		"different currency": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "field", AmountMode: payoutAmountModeSpecified, AmountMinorUnits: int64Pointer(12500), Currency: "SAR",
		},
	}

	for name, input := range cases {
		name, input := name, input
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if got := governedPayoutHash("OperatorContext-main", input); got == baseHash {
				t.Fatalf("hash did not change for %s", name)
			}
		})
	}
}
