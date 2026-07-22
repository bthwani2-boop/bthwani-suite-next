package http

import (
	"database/sql"
	"testing"
	"time"
)

func TestValidateDispatchLocationTimestamp(t *testing.T) {
	now := time.Date(2026, 7, 22, 1, 0, 0, 0, time.UTC)
	previous := now.Add(-30 * time.Second)

	tests := []struct {
		name       string
		recordedAt time.Time
		previous   *time.Time
		want       dispatchLocationTimestampDecision
	}{
		{name: "accepts first fresh sample", recordedAt: now, want: locationTimestampAccepted},
		{name: "rejects stale sample", recordedAt: now.Add(-maxLocationSampleAge - time.Second), want: locationTimestampStale},
		{name: "rejects future sample", recordedAt: now.Add(maxLocationFutureSkew + time.Second), want: locationTimestampFuture},
		{name: "rejects duplicate sample", recordedAt: previous, previous: &previous, want: locationTimestampOutOfOrder},
		{name: "rejects excessive frequency", recordedAt: previous.Add(minLocationSampleInterval - time.Millisecond), previous: &previous, want: locationTimestampTooFrequent},
		{name: "accepts minimum interval", recordedAt: previous.Add(minLocationSampleInterval), previous: &previous, want: locationTimestampAccepted},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validateDispatchLocationTimestamp(tt.recordedAt, now, tt.previous); got != tt.want {
				t.Fatalf("validateDispatchLocationTimestamp() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestValidateDispatchLocationAccuracy(t *testing.T) {
	valid := 12.5
	zero := 0.0
	negative := -1.0
	tooLarge := maxLocationAccuracyMeters + 0.1

	tests := []struct {
		name     string
		accuracy *float64
		want     bool
	}{
		{name: "requires accuracy", accuracy: nil, want: false},
		{name: "accepts governed accuracy", accuracy: &valid, want: true},
		{name: "rejects zero", accuracy: &zero, want: false},
		{name: "rejects negative", accuracy: &negative, want: false},
		{name: "rejects inaccurate sample", accuracy: &tooLarge, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validateDispatchLocationAccuracy(tt.accuracy); got != tt.want {
				t.Fatalf("validateDispatchLocationAccuracy() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSameDispatchLocationSample(t *testing.T) {
	recordedAt := time.Date(2026, 7, 22, 1, 2, 3, 0, time.UTC)
	previousRecordedAt := sql.NullTime{Time: recordedAt, Valid: true}
	previousLatitude := sql.NullFloat64{Float64: 15.369445, Valid: true}
	previousLongitude := sql.NullFloat64{Float64: 44.191006, Valid: true}

	if !sameDispatchLocationSample(recordedAt, 15.369445, 44.191006, previousRecordedAt, previousLatitude, previousLongitude) {
		t.Fatal("expected exact replay to be idempotent")
	}
	if sameDispatchLocationSample(recordedAt, 15.370000, 44.191006, previousRecordedAt, previousLatitude, previousLongitude) {
		t.Fatal("expected same timestamp with changed coordinates to be rejected")
	}
	if sameDispatchLocationSample(recordedAt.Add(time.Second), 15.369445, 44.191006, previousRecordedAt, previousLatitude, previousLongitude) {
		t.Fatal("expected a newer sample to continue through normal validation")
	}
}
