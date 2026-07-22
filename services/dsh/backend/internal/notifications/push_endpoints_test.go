package notifications

import (
	"errors"
	"testing"
)

func TestValidPushActorType(t *testing.T) {
	for _, actorType := range []string{"client", "partner", "captain", "field", "operator"} {
		if !validPushActorType(actorType) {
			t.Fatalf("expected actor type %q to be valid", actorType)
		}
	}
	for _, actorType := range []string{"", "system", "unknown"} {
		if validPushActorType(actorType) {
			t.Fatalf("expected actor type %q to be invalid", actorType)
		}
	}
}

func TestUpsertPushEndpointRejectsMissingDatabase(t *testing.T) {
	_, err := UpsertPushEndpoint(nil, "actor-1", "client", PushEndpointInput{
		Provider:      "expo",
		EndpointToken: "ExponentPushToken[test]",
		DeviceID:      "device-1",
		Platform:      "android",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}

func TestDeactivatePushEndpointRejectsInvalidContext(t *testing.T) {
	for _, testCase := range []struct {
		actorID   string
		actorType string
		deviceID  string
	}{
		{"", "client", "device-1"},
		{"actor-1", "unknown", "device-1"},
		{"actor-1", "client", ""},
	} {
		if err := DeactivatePushEndpoint(nil, testCase.actorID, testCase.actorType, testCase.deviceID); !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for %+v, got %v", testCase, err)
		}
	}
}
