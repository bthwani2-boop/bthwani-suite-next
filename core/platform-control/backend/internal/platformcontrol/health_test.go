package platformcontrol

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDependencyHealthProbeAndAggregation(t *testing.T) {
	healthyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer healthyServer.Close()
	failedServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "degraded", http.StatusServiceUnavailable)
	}))
	defer failedServer.Close()

	service := NewService()
	healthy := service.probeDependency(context.Background(), ServiceDependency{Name: "healthy", HealthURL: healthyServer.URL})
	if healthy.State != StateOperational || healthy.LatencyMS < 0 {
		t.Fatalf("unexpected healthy probe: %#v", healthy)
	}
	failed := service.probeDependency(context.Background(), ServiceDependency{Name: "failed", HealthURL: failedServer.URL})
	if failed.State != StateFixRequired {
		t.Fatalf("unexpected failed probe: %#v", failed)
	}
	if state := aggregateHealthState([]ServicePosture{healthy, failed}); state != StateFixRequired {
		t.Fatalf("expected FIX_REQUIRED aggregate, got %s", state)
	}
	if state := aggregateHealthState([]ServicePosture{healthy}); state != StateOperational {
		t.Fatalf("expected OPERATIONAL aggregate, got %s", state)
	}
}

func TestConfiguredRolloutHealthGate(t *testing.T) {
	gate := map[string]any{
		"requiredState":    "OPERATIONAL",
		"requiredServices": []any{"identity", "dsh"},
		"maxLatencyMs":     float64(250),
	}
	snapshot := HealthSnapshot{
		State: StateOperational,
		Services: []ServicePosture{
			{Service: "identity", State: StateOperational, LatencyMS: 20},
			{Service: "dsh", State: StateOperational, LatencyMS: 40},
		},
	}
	if err := evaluateHealthGate(snapshot, gate); err != nil {
		t.Fatalf("expected health gate to pass, got %v", err)
	}

	degraded := snapshot
	degraded.Services = append([]ServicePosture(nil), snapshot.Services...)
	degraded.Services[1].State = StateFixRequired
	if err := evaluateHealthGate(degraded, gate); !errors.Is(err, ErrHealthGate) {
		t.Fatalf("expected service-state health gate failure, got %v", err)
	}

	slow := snapshot
	slow.Services = append([]ServicePosture(nil), snapshot.Services...)
	slow.Services[0].LatencyMS = 500
	if err := evaluateHealthGate(slow, gate); !errors.Is(err, ErrHealthGate) {
		t.Fatalf("expected latency health gate failure, got %v", err)
	}

	invalid := map[string]any{"requiredState": "PARTIALLY_BOUND"}
	if err := validateHealthGate(invalid); !errors.Is(err, ErrValidation) {
		t.Fatalf("expected invalid gate validation error, got %v", err)
	}
}

func TestAdvanceRolloutFailsClosedWithoutRepository(t *testing.T) {
	service := NewService()
	_, err := service.AdvanceRollout(
		context.Background(),
		"00000000-0000-0000-0000-000000000001",
		"rollout-manager",
		[]string{"platform-rollout-manager"},
		"health-gate-test",
	)
	if err == nil {
		t.Fatal("expected rollout advance to fail closed without repository")
	}
}
