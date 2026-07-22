package http

import (
	"strings"
	"testing"
)

func TestSafeOrderCreateCorrelationNeverExposesMutationKey(t *testing.T) {
	const key = "order-create-key:private-idempotency-value"
	generated := safeOrderCreateCorrelation(
		"tenant-yemen",
		"client-1001",
		"8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5",
		key,
		"",
	)
	if generated == key || strings.Contains(generated, key) {
		t.Fatalf("generated correlation leaked the idempotency key: %q", generated)
	}
	if replay := safeOrderCreateCorrelation(
		"tenant-yemen",
		"client-1001",
		"8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5",
		key,
		key,
	); replay != generated {
		t.Fatalf("missing and reused correlations must resolve to the same safe trace: %q != %q", replay, generated)
	}
	if explicit := safeOrderCreateCorrelation(
		"tenant-yemen",
		"client-1001",
		"8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5",
		key,
		"trace-explicit-1001",
	); explicit != "trace-explicit-1001" {
		t.Fatalf("distinct explicit correlation must be preserved, got %q", explicit)
	}
}

func TestOrderTruthHTTPUUIDValidation(t *testing.T) {
	if !isValidOrderTruthUUID("8ba4e0d1-2f80-42b5-a88a-f8600cf2c4f5") {
		t.Fatal("canonical UUID must be accepted")
	}
	for _, invalid := range []string{"", "not-a-uuid", "8ba4e0d1", "../orders"} {
		if isValidOrderTruthUUID(invalid) {
			t.Fatalf("malformed UUID %q must be rejected", invalid)
		}
	}
}
