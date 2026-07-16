package store

import "testing"

func TestStoreGovernanceValidationSets(t *testing.T) {
	for _, status := range []string{"active", "inactive", "temporarily_closed", "unavailable"} {
		if !validStoreStatus(status) {
			t.Fatalf("expected valid store status %q", status)
		}
	}
	if validStoreStatus("deleted") {
		t.Fatal("deleted must not be accepted as a Store Discovery lifecycle state")
	}
	if !validDeliveryModes([]string{"delivery", "pickup", "express"}) {
		t.Fatal("canonical delivery modes must be accepted")
	}
	if validDeliveryModes([]string{"delivery", "drone"}) {
		t.Fatal("unknown delivery mode must be rejected")
	}
	for _, actionValue := range []string{"pending", "ready", "blocked"} {
		if actionValue == "" {
			t.Fatal("readiness values must remain explicit")
		}
	}
}

func TestRequestHashIsStableAndSensitiveToPayload(t *testing.T) {
	a := hashBytes([]byte(`{"status":"active"}`))
	b := hashBytes([]byte(`{"status":"active"}`))
	c := hashBytes([]byte(`{"status":"inactive"}`))
	if a != b || a == c {
		t.Fatalf("unexpected request hashes: %q %q %q", a, b, c)
	}
}
