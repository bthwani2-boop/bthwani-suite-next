package platformcontrol

import (
	"context"
	"testing"
	"time"
)

func TestRuntimeSnapshotFailsClosedWithoutRepository(t *testing.T) {
	service := NewService()
	service.now = func() time.Time { return time.Date(2026, 7, 18, 12, 0, 0, 0, time.UTC) }

	snapshot := service.RuntimeSnapshot(context.Background())

	if snapshot.Status != StateFixRequired {
		t.Fatalf("expected FIX_REQUIRED, got %s", snapshot.Status)
	}
	if snapshot.VariablesState != StateFixRequired || snapshot.AuditState != StateFixRequired {
		t.Fatalf("expected persistent capabilities to fail closed, got variables=%s audit=%s", snapshot.VariablesState, snapshot.AuditState)
	}
	if snapshot.RolloutsState != StateContractRequired {
		t.Fatalf("expected rollouts to remain CONTRACT_REQUIRED, got %s", snapshot.RolloutsState)
	}
	if len(snapshot.Evidence) == 0 {
		t.Fatal("expected evidence notes")
	}
}

func TestRepositoryBackedReadsRejectMissingRepository(t *testing.T) {
	service := NewService()

	if _, err := service.EffectiveRuntimeConfig(context.Background()); err == nil {
		t.Fatal("expected effective runtime config to reject a missing repository")
	}
	if _, err := service.Variables(context.Background()); err == nil {
		t.Fatal("expected variables read to reject a missing repository")
	}
	if _, err := service.ChangeSets(context.Background()); err == nil {
		t.Fatal("expected change-set read to reject a missing repository")
	}
}
