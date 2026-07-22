package payout

import "testing"

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

func TestGovernedPayoutHashBindsDestinationAndIntent(t *testing.T) {
	t.Parallel()

	base := governedCreatePayoutInput{
		BeneficiaryActorID:   "field-1",
		BeneficiaryActorType: "field",
		PayoutDestinationID: "destination-1",
		AmountMinorUnits:     12500,
		Currency:             "YER",
	}
	baseHash := governedPayoutHash(base)
	if baseHash == "" {
		t.Fatal("expected non-empty payout hash")
	}

	cases := map[string]governedCreatePayoutInput{
		"different actor id": {
			BeneficiaryActorID: "field-2", BeneficiaryActorType: "field", PayoutDestinationID: "destination-1", AmountMinorUnits: 12500, Currency: "YER",
		},
		"different actor type": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "captain", PayoutDestinationID: "destination-1", AmountMinorUnits: 12500, Currency: "YER",
		},
		"different destination": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "field", PayoutDestinationID: "destination-2", AmountMinorUnits: 12500, Currency: "YER",
		},
		"different amount": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "field", PayoutDestinationID: "destination-1", AmountMinorUnits: 12600, Currency: "YER",
		},
		"different currency": {
			BeneficiaryActorID: "field-1", BeneficiaryActorType: "field", PayoutDestinationID: "destination-1", AmountMinorUnits: 12500, Currency: "SAR",
		},
	}

	for name, input := range cases {
		name, input := name, input
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if got := governedPayoutHash(input); got == baseHash {
				t.Fatalf("hash did not change for %s", name)
			}
		})
	}
}
