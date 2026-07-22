package platformpolicies

import "testing"

func baseJRN029Snapshot() operationalSnapshot {
	return operationalSnapshot{
		Zone:         Zone{ID: "11111111-1111-1111-1111-111111111111", CityCode: "sanaa", IsActive: true, Version: 3},
		ActiveStores: 2,
		SLA: OperationalSLA{
			Configured:        true,
			RuleID:            "22222222-2222-2222-2222-222222222222",
			Category:          "default",
			MaxPrepMins:       20,
			MaxAssignmentMins: 10,
			MaxDeliveryMins:   45,
			Version:           4,
		},
		Capacity: OperationalCapacity{
			Configured:          true,
			ConfigID:            "33333333-3333-3333-3333-333333333333",
			MaxConcurrentOrders: 100,
			MaxCaptainsOnline:   30,
			ThrottleThreshold:   0.8,
			Version:             5,
		},
		ModePolicy: &DeliveryModePolicy{
			ID:              "44444444-4444-4444-4444-444444444444",
			FulfillmentMode: FulfillmentModeBthwaniDelivery,
			IsEnabled:       true,
			SlaCategory:     "default",
			Version:         6,
		},
		Input: OperationalEvaluationInput{
			ZoneID:          "11111111-1111-1111-1111-111111111111",
			ServiceAreaCode: "sanaa",
			FulfillmentMode: FulfillmentModeBthwaniDelivery,
			SlaCategory:     "default",
			ActiveOrders:    10,
			CaptainsOnline:  5,
		},
	}
}

func TestJRN029OperationalDecisionAllowsCanonicalBthwaniFlow(t *testing.T) {
	decision := BuildOperationalDecision(baseJRN029Snapshot())
	if !decision.Serviceable || decision.Decision != "serviceable" {
		t.Fatalf("expected serviceable decision, got %#v", decision)
	}
	if !decision.Effects.CartAllowed || !decision.Effects.CheckoutAllowed ||
		!decision.Effects.OrderCreationAllowed || !decision.Effects.DispatchAllowed {
		t.Fatalf("expected cart checkout order and dispatch effects, got %#v", decision.Effects)
	}
	if decision.SLA.MaxAssignmentMins != 10 {
		t.Fatalf("expected assignment SLA readback, got %#v", decision.SLA)
	}
}

func TestJRN029OperationalDecisionFailsClosedForPause(t *testing.T) {
	snapshot := baseJRN029Snapshot()
	snapshot.Capacity.IsPaused = true
	snapshot.Capacity.PauseReason = "weather incident"
	decision := BuildOperationalDecision(snapshot)
	if decision.Serviceable || decision.Decision != "paused" {
		t.Fatalf("expected paused denial, got %#v", decision)
	}
	if decision.Effects.CartAllowed || decision.Effects.CheckoutAllowed ||
		decision.Effects.OrderCreationAllowed || decision.Effects.DispatchAllowed {
		t.Fatalf("paused policy must deny all creation effects: %#v", decision.Effects)
	}
}

func TestJRN029OperationalDecisionFailsClosedForDisabledMode(t *testing.T) {
	snapshot := baseJRN029Snapshot()
	snapshot.ModePolicy.IsEnabled = false
	decision := BuildOperationalDecision(snapshot)
	if decision.Serviceable || decision.Decision != "mode_disabled" {
		t.Fatalf("expected disabled mode denial, got %#v", decision)
	}
}

func TestJRN029OperationalDecisionThrottlesAtConfiguredPressure(t *testing.T) {
	snapshot := baseJRN029Snapshot()
	snapshot.Input.ActiveOrders = 80
	decision := BuildOperationalDecision(snapshot)
	if decision.Serviceable || decision.Decision != "throttled" {
		t.Fatalf("expected throttled denial, got %#v", decision)
	}
	if decision.PressureRatio != 0.8 {
		t.Fatalf("expected exact pressure readback, got %v", decision.PressureRatio)
	}
}

func TestJRN029ClientPickupNeverCreatesCaptainDispatch(t *testing.T) {
	snapshot := baseJRN029Snapshot()
	snapshot.Input.FulfillmentMode = FulfillmentModeClientPickup
	snapshot.ModePolicy.FulfillmentMode = FulfillmentModeClientPickup
	decision := BuildOperationalDecision(snapshot)
	if !decision.Serviceable || decision.Effects.DispatchAllowed || !decision.Effects.ClientPickupRequired {
		t.Fatalf("expected pickup without dispatch, got %#v", decision.Effects)
	}
}

func TestJRN029OperationalDecisionRejectsServiceAreaMismatch(t *testing.T) {
	snapshot := baseJRN029Snapshot()
	snapshot.Input.ServiceAreaCode = "aden"
	decision := BuildOperationalDecision(snapshot)
	if decision.Serviceable || decision.Decision != "unserviceable" {
		t.Fatalf("expected service-area denial, got %#v", decision)
	}
	if len(decision.ReasonCodes) != 1 || decision.ReasonCodes[0] != "SERVICE_AREA_MISMATCH" {
		t.Fatalf("expected mismatch reason, got %#v", decision.ReasonCodes)
	}
}
