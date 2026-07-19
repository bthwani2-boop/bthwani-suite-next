package platformpolicies

import (
	"context"
	"testing"
)

func validPlatformPolicyTestMutation() MutationContext {
	return MutationContext{
		ActorID:        "operator-test-001",
		ActorSurface:   "control-panel",
		IdempotencyKey: "platform-policy-test-001",
		CorrelationID:  "platform-policy-test-001",
		Reason:         "validation test",
	}
}

func TestCreateZoneRequiresNameAndCityCode(t *testing.T) {
	cases := []CreateZoneInput{
		{Name: "", CityCode: "SAN", Description: "desc"},
		{Name: "Downtown", CityCode: "", Description: "desc"},
	}
	for _, input := range cases {
		_, err := CreateZone(context.Background(), nil, input, validPlatformPolicyTestMutation())
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for name=%q cityCode=%q, got %v", input.Name, input.CityCode, err)
		}
	}
}

func TestUpsertSlaRuleRequiresZoneAndCategory(t *testing.T) {
	cases := []UpsertSlaInput{
		{ZoneID: "", Category: "grocery", MaxPrepMins: 30, MaxDeliveryMins: 60, ExpectedVersion: 0},
		{ZoneID: "zone-1", Category: "", MaxPrepMins: 30, MaxDeliveryMins: 60, ExpectedVersion: 0},
	}
	for _, input := range cases {
		_, err := UpsertSlaRule(context.Background(), nil, input, validPlatformPolicyTestMutation())
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for zoneID=%q category=%q, got %v", input.ZoneID, input.Category, err)
		}
	}
}

func TestUpsertCapacityRequiresZoneID(t *testing.T) {
	input := UpsertCapacityInput{
		ZoneID:              "",
		MaxConcurrentOrders: 100,
		MaxCaptainsOnline:   20,
		ThrottleThreshold:   0.8,
		ExpectedVersion:     0,
	}
	_, err := UpsertCapacity(context.Background(), nil, input, validPlatformPolicyTestMutation())
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for empty zoneID, got %v", err)
	}
}
