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

func TestAdvanceRolloutFailsClosedWhenHealthIsNotOperational(t *testing.T) {
	service := NewService()
	_, err := service.AdvanceRollout(
		context.Background(),
		"00000000-0000-0000-0000-000000000001",
		"rollout-manager",
		[]string{"platform-rollout-manager"},
		"health-gate-test",
	)
	if !errors.Is(err, ErrHealthGate) {
		t.Fatalf("expected ErrHealthGate, got %v", err)
	}
}
