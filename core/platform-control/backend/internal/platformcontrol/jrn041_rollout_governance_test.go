package platformcontrol

import (
	"errors"
	"testing"
)

func TestValidateRolloutTargetScope(t *testing.T) {
	t.Parallel()

	valid := []map[string]any{
		{"audience": "beta-customers"},
		{"city": "sanaa", "surface": "app-client"},
		{"regions": []string{"sanaa", "taiz"}, "surfaces": []any{"app-client", "app-partner"}},
		{"audienceIds": []any{"actor-1"}},
	}
	for _, scope := range valid {
		if err := validateRolloutTargetScope(scope); err != nil {
			t.Fatalf("expected valid scope %#v, got %v", scope, err)
		}
	}

	invalid := []map[string]any{
		nil,
		{},
		{"surface": ""},
		{"regions": []string{}},
		{"regions": []any{"sanaa", ""}},
		{"percentage": 10},
		{"surface": "app-client", "arbitrary": true},
	}
	for _, scope := range invalid {
		if err := validateRolloutTargetScope(scope); !errors.Is(err, ErrValidation) {
			t.Fatalf("expected validation error for scope %#v, got %v", scope, err)
		}
	}
}

func TestEvaluateHealthGate(t *testing.T) {
	t.Parallel()

	gate := map[string]any{
		"requiredState":    "OPERATIONAL",
		"requiredServices": []string{"dsh"},
		"maxLatencyMs":     250,
	}
	operational := HealthSnapshot{
		State: StateOperational,
		Services: []ServicePosture{
			{Service: "dsh", State: StateOperational, LatencyMS: 20},
		},
	}
	if err := evaluateHealthGate(operational, gate); err != nil {
		t.Fatalf("expected operational gate to pass, got %v", err)
	}

	degraded := operational
	degraded.State = StateFixRequired
	if err := evaluateHealthGate(degraded, gate); !errors.Is(err, ErrHealthGate) {
		t.Fatalf("expected aggregate health failure, got %v", err)
	}

	missingService := HealthSnapshot{State: StateOperational}
	if err := evaluateHealthGate(missingService, gate); !errors.Is(err, ErrHealthGate) {
		t.Fatalf("expected missing service failure, got %v", err)
	}

	highLatency := operational
	highLatency.Services = []ServicePosture{{Service: "dsh", State: StateOperational, LatencyMS: 251}}
	if err := evaluateHealthGate(highLatency, gate); !errors.Is(err, ErrHealthGate) {
		t.Fatalf("expected latency gate failure, got %v", err)
	}

	if err := validateHealthGate(map[string]any{"requiredState": "PARTIALLY_BOUND"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("expected requiredState validation error, got %v", err)
	}
}
