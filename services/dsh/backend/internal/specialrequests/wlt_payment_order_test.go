package specialrequests

import (
	"errors"
	"testing"
)

func TestWltPaymentEventAdvancesProjection(t *testing.T) {
	tests := []struct {
		name     string
		current  string
		incoming string
		advances bool
	}{
		{name: "first event", incoming: "reference_created", advances: true},
		{name: "forward transition", current: "reference_created", incoming: "authorized", advances: true},
		{name: "terminal transition", current: "authorized", incoming: "captured", advances: true},
		{name: "late earlier event", current: "captured", incoming: "authorized", advances: false},
		{name: "same terminal event", current: "captured", incoming: "captured", advances: false},
		{name: "alternate non-terminal branch", current: "authorized", incoming: "cod_pending", advances: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			advances, err := wltPaymentEventAdvancesProjection(tt.current, tt.incoming)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if advances != tt.advances {
				t.Fatalf("advances=%v, want %v", advances, tt.advances)
			}
		})
	}
}

func TestWltPaymentEventDifferentTerminalOutcomeFailsClosed(t *testing.T) {
	for _, pair := range [][2]string{
		{"failed", "captured"},
		{"expired", "cod_finalized"},
		{"captured", "failed"},
	} {
		advances, err := wltPaymentEventAdvancesProjection(pair[0], pair[1])
		if advances {
			t.Fatalf("%s -> %s must not advance the DSH projection", pair[0], pair[1])
		}
		if !errors.Is(err, ErrConflict) || !errors.Is(err, ErrWltTerminalOutcomeConflict) {
			t.Fatalf("%s -> %s must fail as a terminal conflict, got %v", pair[0], pair[1], err)
		}
	}
}

func TestWltPaymentEventReferenceUsesCanonicalDerivedKey(t *testing.T) {
	got, err := WltPaymentEventReference("operator-context", "request-id", "session-id", "captured", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) <= len("wlt-derived:") || got[:len("wlt-derived:")] != "wlt-derived:" {
		t.Fatalf("reference=%q, want a derived WLT reference", got)
	}

	withEventID, err := WltPaymentEventReference("operator-context", "request-id", "session-id", "captured", "event-1234")
	if err != nil {
		t.Fatalf("unexpected error with event id: %v", err)
	}
	if withEventID != "wlt:event-1234" {
		t.Fatalf("reference=%q, want wlt:event-1234", withEventID)
	}
}
