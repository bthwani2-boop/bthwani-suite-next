package platformcontrol

import (
	"context"
	"testing"
	"time"
)

func TestRuntimeSnapshotIsExplicitlyNotFullyReady(t *testing.T) {
	service := NewService()
	service.now = func() time.Time { return time.Date(2026, 7, 16, 12, 0, 0, 0, time.UTC) }

	snapshot := service.RuntimeSnapshot(context.Background())

	if snapshot.Status != StatePartiallyBound {
		t.Fatalf("expected PARTIALLY_BOUND, got %s", snapshot.Status)
	}
	if snapshot.HealthState != StateUnknownHealth {
		t.Fatalf("expected UNKNOWN_HEALTH, got %s", snapshot.HealthState)
	}
	if snapshot.RollbackState != StateRollbackUnavailable {
		t.Fatalf("expected ROLLBACK_UNAVAILABLE, got %s", snapshot.RollbackState)
	}
	if len(snapshot.Evidence) == 0 {
		t.Fatal("expected evidence notes")
	}
}

func TestEffectiveRuntimeConfigUsesFallbackUntilStoreExists(t *testing.T) {
	service := NewService()

	config := service.EffectiveRuntimeConfig(context.Background())

	if !config.Stale {
		t.Fatal("expected stale config until runtime store exists")
	}
	if !config.FallbackUsed {
		t.Fatal("expected fallback to be marked as used")
	}
	if len(config.Values) != 0 {
		t.Fatalf("expected no fake values, got %d", len(config.Values))
	}
}
