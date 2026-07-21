package dispatch

import (
	"errors"
	"testing"
)

func TestValidateGovernedCreateInputNormalizesDefaults(t *testing.T) {
	input := GovernedCreateAssignmentInput{
		OrderID:         " order-1 ",
		CaptainID:       " captain-1 ",
		ActorID:         " operator-1 ",
		ServiceAreaCode: " sana-north ",
		IdempotencyKey:  " dispatch-key-0001 ",
	}
	if err := validateGovernedCreateInput(&input); err != nil {
		t.Fatalf("expected valid input, got %v", err)
	}
	if input.TenantID != DefaultDispatchTenantID {
		t.Fatalf("expected default tenant, got %q", input.TenantID)
	}
	if input.ResponseTimeoutSecond != 90 {
		t.Fatalf("expected default response timeout 90, got %d", input.ResponseTimeoutSecond)
	}
	if input.OrderID != "order-1" || input.CaptainID != "captain-1" || input.ServiceAreaCode != "sana-north" {
		t.Fatalf("expected normalized identifiers, got %+v", input)
	}
}

func TestValidateGovernedCreateInputRejectsInvalidBoundaries(t *testing.T) {
	negativeDistance := -1
	cases := []GovernedCreateAssignmentInput{
		{CaptainID: "captain-1", ActorID: "operator-1", ServiceAreaCode: "sana", IdempotencyKey: "dispatch-key-0001"},
		{OrderID: "order-1", CaptainID: "captain-1", ActorID: "operator-1", ServiceAreaCode: "sana", IdempotencyKey: "short"},
		{OrderID: "order-1", CaptainID: "captain-1", ActorID: "operator-1", ServiceAreaCode: "sana", IdempotencyKey: "dispatch-key-0001", Priority: 101},
		{OrderID: "order-1", CaptainID: "captain-1", ActorID: "operator-1", ServiceAreaCode: "sana", IdempotencyKey: "dispatch-key-0001", DistanceMeters: &negativeDistance},
		{OrderID: "order-1", CaptainID: "captain-1", ActorID: "operator-1", ServiceAreaCode: "sana", IdempotencyKey: "dispatch-key-0001", ResponseTimeoutSecond: 29},
		{OrderID: "order-1", CaptainID: "captain-1", ActorID: "operator-1", ServiceAreaCode: "sana", IdempotencyKey: "dispatch-key-0001", ResponseTimeoutSecond: 601},
	}
	for i := range cases {
		input := cases[i]
		if err := validateGovernedCreateInput(&input); !errors.Is(err, ErrInvalid) {
			t.Fatalf("case %d: expected ErrInvalid, got %v", i, err)
		}
	}
}

func TestFinalizeCandidateUsesAccreditationAvailabilityAndCapacity(t *testing.T) {
	eligible := CaptainDispatchCandidate{
		AccreditationStatus:  "approved",
		AvailabilityStatus:   "available",
		MaxActiveAssignments: 3,
		ActiveAssignments:    1,
	}
	finalizeCandidate(&eligible)
	if !eligible.Eligible || eligible.RemainingCapacity != 2 || eligible.IneligibilityReason != "" {
		t.Fatalf("unexpected eligible candidate projection: %+v", eligible)
	}

	atCapacity := CaptainDispatchCandidate{
		AccreditationStatus:  "approved",
		AvailabilityStatus:   "available",
		MaxActiveAssignments: 1,
		ActiveAssignments:    1,
	}
	finalizeCandidate(&atCapacity)
	if atCapacity.Eligible || atCapacity.IneligibilityReason != "CAPTAIN_AT_CAPACITY" {
		t.Fatalf("expected capacity rejection, got %+v", atCapacity)
	}

	notAccredited := CaptainDispatchCandidate{
		AccreditationStatus:  "pending",
		AvailabilityStatus:   "available",
		MaxActiveAssignments: 1,
	}
	finalizeCandidate(&notAccredited)
	if notAccredited.Eligible || notAccredited.IneligibilityReason != "CAPTAIN_NOT_ACCREDITED" {
		t.Fatalf("expected accreditation rejection, got %+v", notAccredited)
	}
}

func TestDispatchErrorCodeIsStable(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{ErrCaptainAtCapacity, "CAPTAIN_AT_CAPACITY"},
		{ErrCaptainNotEligible, "CAPTAIN_NOT_ELIGIBLE"},
		{ErrOfferExpired, "DISPATCH_OFFER_EXPIRED"},
		{ErrConflict, "DISPATCH_CONFLICT"},
	}
	for _, tc := range cases {
		if got := dispatchErrorCode(tc.err); got != tc.want {
			t.Fatalf("expected %s, got %s", tc.want, got)
		}
	}
}
