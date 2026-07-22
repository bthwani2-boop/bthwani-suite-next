package clientaddress

import (
	"errors"
	"testing"
	"time"
)

func findOperationTelemetry(t *testing.T, operation string) OperationTelemetry {
	t.Helper()
	for _, item := range TelemetrySnapshot() {
		if item.Operation == operation {
			return item
		}
	}
	t.Fatalf("operation %q not found in telemetry snapshot", operation)
	return OperationTelemetry{}
}

func TestRecordOperationAggregatesSuccessAndConflictWithoutIdentifiers(t *testing.T) {
	operation := "test_update_aggregate"
	RecordOperation(operation, time.Now().Add(-2*time.Millisecond), nil)
	RecordOperation(operation, time.Now().Add(-3*time.Millisecond), ErrConflict)

	snapshot := findOperationTelemetry(t, operation)
	if snapshot.Requests != 2 {
		t.Fatalf("requests = %d, want 2", snapshot.Requests)
	}
	if snapshot.Failures != 1 {
		t.Fatalf("failures = %d, want 1", snapshot.Failures)
	}
	if snapshot.Outcomes["success"] != 1 || snapshot.Outcomes["version_conflict"] != 1 {
		t.Fatalf("unexpected outcomes: %+v", snapshot.Outcomes)
	}
	if snapshot.AverageDuration <= 0 || snapshot.MaxDuration <= 0 {
		t.Fatalf("expected positive durations: %+v", snapshot)
	}
}

func TestTelemetryOutcomeClassifiesGovernedAddressFailures(t *testing.T) {
	t.Parallel()

	tests := []struct {
		err  error
		want string
	}{
		{err: nil, want: "success"},
		{err: ErrInvalid, want: "invalid"},
		{err: ErrNotFound, want: "not_found"},
		{err: ErrConflict, want: "version_conflict"},
		{err: ErrMutationIdempotencyConflict, want: "idempotency_conflict"},
		{err: ErrServiceAreaUnverified, want: "service_area_unverified"},
		{err: errors.New("unexpected"), want: "internal_error"},
	}
	for _, test := range tests {
		if got := telemetryOutcome(test.err); got != test.want {
			t.Fatalf("telemetryOutcome(%v) = %q, want %q", test.err, got, test.want)
		}
	}
}
