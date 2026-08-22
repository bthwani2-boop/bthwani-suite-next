package collateral

import "testing"

func TestNormalizePolicyInputCanonicalizesAndValidatesCurrency(t *testing.T) {
	valid, err := normalizePolicyInput(upsertPolicyInput{
		PolicyID:                    "  captain-collateral-v1  ",
		ExpectedVersion:             0,
		Enabled:                     true,
		MinimumCollateralMinorUnits: 500,
		Currency:                    " yer ",
		ChangeReason:                "  initial policy  ",
		UpdatedByActorID:            "  operator-1  ",
	})
	if err != nil {
		t.Fatalf("valid policy rejected: %v", err)
	}
	if valid.PolicyID != "captain-collateral-v1" || valid.Currency != "YER" || valid.ChangeReason != "initial policy" || valid.UpdatedByActorID != "operator-1" {
		t.Fatalf("policy was not canonicalized: %#v", valid)
	}

	for _, currency := range []string{"1A$", "US", "US1", "éER"} {
		input := valid
		input.Currency = currency
		if _, err := normalizePolicyInput(input); err != ErrInvalidInput {
			t.Fatalf("currency %q error=%v, want %v", currency, err, ErrInvalidInput)
		}
	}
}

func TestNormalizeCollateralMutationInputsRejectIncompleteValues(t *testing.T) {
	if _, err := normalizeAllocationInput(allocateInput{CaptainID: " captain-1 ", PaymentSessionID: " session-1 ", AllocatedByActorID: " actor-1 "}); err != nil {
		t.Fatalf("valid allocation rejected: %v", err)
	}
	if _, err := normalizeReleaseInput(releaseInput{CaptainID: " captain-1 ", PositionID: " position-1 ", ReleaseReason: " safe release ", ReleasedByActorID: " actor-1 "}); err != nil {
		t.Fatalf("valid release rejected: %v", err)
	}

	allocationCases := []allocateInput{
		{PaymentSessionID: "session-1", AllocatedByActorID: "actor-1"},
		{CaptainID: "captain-1", AllocatedByActorID: "actor-1"},
		{CaptainID: "captain-1", PaymentSessionID: "session-1"},
	}
	for _, input := range allocationCases {
		if _, err := normalizeAllocationInput(input); err != ErrInvalidInput {
			t.Fatalf("allocation %#v error=%v, want %v", input, err, ErrInvalidInput)
		}
	}

	releaseCases := []releaseInput{
		{PositionID: "position-1", ReleaseReason: "reason", ReleasedByActorID: "actor-1"},
		{CaptainID: "captain-1", ReleaseReason: "reason", ReleasedByActorID: "actor-1"},
		{CaptainID: "captain-1", PositionID: "position-1", ReleasedByActorID: "actor-1"},
		{CaptainID: "captain-1", PositionID: "position-1", ReleaseReason: "reason"},
	}
	for _, input := range releaseCases {
		if _, err := normalizeReleaseInput(input); err != ErrInvalidInput {
			t.Fatalf("release %#v error=%v, want %v", input, err, ErrInvalidInput)
		}
	}
}
