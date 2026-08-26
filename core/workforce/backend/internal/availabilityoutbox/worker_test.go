package availabilityoutbox

import (
	"strings"
	"testing"
	"time"
)

func TestAvailabilityOutboxBackoffIsBounded(t *testing.T) {
	if got := backoffSeconds(1); got != 2 {
		t.Fatalf("first retry backoff = %d, want 2 seconds", got)
	}
	if got := backoffSeconds(10); got != 1024 {
		t.Fatalf("tenth retry backoff = %d, want 1024 seconds", got)
	}
	if got := backoffSeconds(100); got > 1800 {
		t.Fatalf("retry backoff = %d, exceeds 30 minutes", got)
	}
}

func TestAvailabilityOutboxDiagnosticsDistinguishDeliveryAndReadbackUnknown(t *testing.T) {
	if diagnosticCode(false) != "remote_outcome_unknown" {
		t.Fatalf("delivery unknown diagnostic = %q", diagnosticCode(false))
	}
	if diagnosticCode(true) != "remote_readback_unavailable" {
		t.Fatalf("readback unknown diagnostic = %q", diagnosticCode(true))
	}
	if unknownDiagnostic(false) != "delivery_attempt_budget_exhausted" || unknownDiagnostic(true) != "reconciliation_exhausted" {
		t.Fatalf("unknown terminal diagnostics are not distinct")
	}
	if !unknownIsTerminal(maxDeliveryAttempts, 0, false) || !unknownIsTerminal(0, maxReadbackAttempts, true) {
		t.Fatal("unknown outcomes must become terminal at their bounded retry limits")
	}
	if unknownIsTerminal(maxDeliveryAttempts-1, maxReadbackAttempts-1, false) || unknownIsTerminal(maxDeliveryAttempts-1, maxReadbackAttempts-1, true) {
		t.Fatal("unknown outcomes must remain recoverable below their retry limits")
	}
}

func TestAvailabilityOutboxRecoveryRequiresReason(t *testing.T) {
	if err := RetryFailed(nil, "id", " "); err == nil || !strings.Contains(err.Error(), "reason") {
		t.Fatalf("expected retry reason validation, got %v", err)
	}
	if err := RequeueForReconciliation(nil, "id", " "); err == nil || !strings.Contains(err.Error(), "reason") {
		t.Fatalf("expected reconciliation reason validation, got %v", err)
	}
}

func TestAvailabilityOutboxLeaseIntervalRejectsNonPositiveDuration(t *testing.T) {
	if _, err := leaseInterval(0); err == nil {
		t.Fatal("zero lease must be rejected")
	}
	value, err := leaseInterval(2 * time.Minute)
	if err != nil || value != "120.000000 seconds" {
		t.Fatalf("lease interval = %q/%v, want 120 seconds", value, err)
	}
}
