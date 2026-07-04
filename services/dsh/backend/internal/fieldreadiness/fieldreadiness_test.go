package fieldreadiness

import "testing"

func TestResolveOnboardingStatusPending(t *testing.T) {
	if got := resolveOnboardingStatus(0, 0); got != "pending" {
		t.Fatalf("expected pending when no completed visits, got %q", got)
	}
}

func TestResolveOnboardingStatusEscalationRequired(t *testing.T) {
	if got := resolveOnboardingStatus(1, 2); got != "escalation_required" {
		t.Fatalf("expected escalation_required when open escalations remain, got %q", got)
	}
}

func TestResolveOnboardingStatusComplete(t *testing.T) {
	if got := resolveOnboardingStatus(1, 0); got != "complete" {
		t.Fatalf("expected complete when a visit is done and no open escalations, got %q", got)
	}
}

func TestCreateVisitRequiresStoreAndAgent(t *testing.T) {
	cases := []CreateVisitInput{
		{FieldAgentID: "agent-1"},
		{StoreID: "store-1"},
	}
	for _, input := range cases {
		_, err := CreateVisit(nil, input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestCreateEscalationRequiresStoreRaisedByAndDescription(t *testing.T) {
	cases := []CreateEscalationInput{
		{RaisedBy: "agent-1", Description: "issue"},
		{StoreID: "store-1", Description: "issue"},
		{StoreID: "store-1", RaisedBy: "agent-1"},
	}
	for _, input := range cases {
		_, err := CreateEscalation(nil, input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}
