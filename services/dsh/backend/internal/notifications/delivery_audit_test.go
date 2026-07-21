package notifications

import (
	"errors"
	"testing"
)

func TestValidDeliveryOutcome(t *testing.T) {
	for _, value := range []string{"", "sent", "retry_scheduled", "dead_letter"} {
		if !validDeliveryOutcome(value) {
			t.Fatalf("expected valid outcome %q", value)
		}
	}
	if validDeliveryOutcome("unknown") {
		t.Fatal("unknown outcome must be rejected")
	}
}

func TestListDeliveryAttemptsRejectsInvalidContext(t *testing.T) {
	if _, _, err := ListDeliveryAttempts(nil, "sent", 100); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for nil database, got %v", err)
	}
	if _, _, err := ListDeliveryAttempts(nil, "unknown", 100); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for invalid outcome, got %v", err)
	}
}
