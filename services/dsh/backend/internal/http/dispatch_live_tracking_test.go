package http

import (
	"testing"
	"time"

	"dsh-api/internal/dispatch"
)

func TestClientCanSeeCaptainLocation(t *testing.T) {
	tests := []struct {
		status dispatch.DeliveryStatus
		want   bool
	}{
		{status: dispatch.DeliveryAssigned, want: false},
		{status: dispatch.DeliveryDriverAssigned, want: false},
		{status: dispatch.DeliveryDriverArrivedStore, want: false},
		{status: dispatch.DeliveryPickedUp, want: true},
		{status: dispatch.DeliveryArrivedCustomer, want: true},
		{status: dispatch.DeliveryDelivered, want: false},
		{status: dispatch.DeliveryReturningToStore, want: false},
		{status: dispatch.DeliveryReturnedToStore, want: false},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			if got := clientCanSeeCaptainLocation(tt.status); got != tt.want {
				t.Fatalf("clientCanSeeCaptainLocation(%q) = %v, want %v", tt.status, got, tt.want)
			}
		})
	}
}

func TestTrackingFreshness(t *testing.T) {
	now := time.Date(2026, 7, 22, 3, 0, 0, 0, time.UTC)
	tests := []struct {
		name       string
		recordedAt time.Time
		wantState  string
		wantAge    int64
	}{
		{name: "fresh", recordedAt: now.Add(-2 * time.Minute), wantState: "fresh", wantAge: 120},
		{name: "stale", recordedAt: now.Add(-7 * time.Minute), wantState: "stale", wantAge: 420},
		{name: "lost", recordedAt: now.Add(-11 * time.Minute), wantState: "lost", wantAge: 660},
		{name: "future clock skew clamps age", recordedAt: now.Add(time.Minute), wantState: "fresh", wantAge: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			state, age := trackingFreshness(tt.recordedAt, now)
			if state != tt.wantState || age != tt.wantAge {
				t.Fatalf("trackingFreshness() = (%q, %d), want (%q, %d)", state, age, tt.wantState, tt.wantAge)
			}
		})
	}
}

func TestRoundTrackingCoordinateReducesPrecision(t *testing.T) {
	if got := roundTrackingCoordinate(15.3694458); got != 15.3694 {
		t.Fatalf("roundTrackingCoordinate() = %.7f, want 15.3694", got)
	}
	if got := roundTrackingCoordinate(44.1910064); got != 44.191 {
		t.Fatalf("roundTrackingCoordinate() = %.7f, want 44.1910", got)
	}
}
