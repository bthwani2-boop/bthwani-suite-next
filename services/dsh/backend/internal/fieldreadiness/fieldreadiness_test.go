package fieldreadiness

import (
	"context"
	"testing"
	"time"

	"dsh-api/internal/store"
)

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
	validLoc := &LocationEvidence{
		Latitude:       15.3694,
		Longitude:      44.1910,
		AccuracyMeters: 5.0,
		CapturedAt:     time.Now(),
		Provider:       "gps",
	}
	cases := []CreateVisitInput{
		{FieldAgentID: "agent-1", StartLocation: validLoc},
		{StoreID: "store-1", StartLocation: validLoc},
	}
	actor := store.StoreActor{ID: "agent-1", Role: "field"}
	for _, input := range cases {
		_, err := CreateVisit(context.Background(), nil, actor, input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestCreateVisitRequiresGPS(t *testing.T) {
	actor := store.StoreActor{ID: "agent-1", Role: "field"}
	// nil location
	_, err := CreateVisit(context.Background(), nil, actor, CreateVisitInput{StoreID: "s", FieldAgentID: "a"})
	if err != ErrLocationRequired {
		t.Fatalf("expected ErrLocationRequired for nil GPS, got %v", err)
	}
	// mocked location
	_, err = CreateVisit(context.Background(), nil, actor, CreateVisitInput{
		StoreID: "s", FieldAgentID: "a",
		StartLocation: &LocationEvidence{Latitude: 15.3, Longitude: 44.1, AccuracyMeters: 5, CapturedAt: time.Now(), IsMocked: true},
	})
	if err != ErrLocationMocked {
		t.Fatalf("expected ErrLocationMocked, got %v", err)
	}
	// poor accuracy
	_, err = CreateVisit(context.Background(), nil, actor, CreateVisitInput{
		StoreID: "s", FieldAgentID: "a",
		StartLocation: &LocationEvidence{Latitude: 15.3, Longitude: 44.1, AccuracyMeters: 200, CapturedAt: time.Now()},
	})
	if err != ErrLocationAccuracy {
		t.Fatalf("expected ErrLocationAccuracy, got %v", err)
	}
}


func TestCreateEscalationRequiresStoreRaisedByAndDescription(t *testing.T) {
	cases := []CreateEscalationInput{
		{RaisedBy: "agent-1", Description: "issue"},
		{StoreID: "store-1", Description: "issue"},
		{StoreID: "store-1", RaisedBy: "agent-1"},
	}
	actor := store.StoreActor{ID: "agent-1", Role: "field"}
	for _, input := range cases {
		_, err := CreateEscalation(context.Background(), nil, actor, input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}
