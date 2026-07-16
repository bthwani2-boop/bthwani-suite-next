package platformcontrol

import (
	"context"
	"time"
)

type Service struct {
	now func() time.Time
}

func NewService() *Service {
	return &Service{now: time.Now}
}

func (s *Service) RuntimeSnapshot(ctx context.Context) RuntimeSnapshot {
	_ = ctx
	return RuntimeSnapshot{
		Status:         StatePartiallyBound,
		Revision:       "platform-control-p1-readonly",
		GeneratedAt:    s.now().UTC(),
		VariablesState: StateContractRequired,
		FlagsState:     StateContractRequired,
		RolloutsState:  StateContractRequired,
		HealthState:    StateUnknownHealth,
		AuditState:     StateContractRequired,
		RollbackState:  StateRollbackUnavailable,
		ServicesState:  StateContractRequired,
		Evidence: []string{
			"core/platform-control contract is active for read-only P1 posture",
			"no platform variable database is attached yet",
			"no local-only mutation, rollout, audit, or rollback is enabled",
		},
	}
}

func (s *Service) EffectiveRuntimeConfig(ctx context.Context) EffectiveRuntimeConfig {
	_ = ctx
	return EffectiveRuntimeConfig{
		Revision:        "platform-control-p1-readonly",
		Stale:           true,
		FallbackUsed:    true,
		EvaluationTrace: []string{"compiled safe default only", "runtime variable store not attached"},
		Values:          map[string]any{},
	}
}

func (s *Service) Variables(ctx context.Context) []Variable {
	_ = ctx
	return []Variable{}
}

func (s *Service) FeatureFlags(ctx context.Context) []FeatureFlag {
	_ = ctx
	return []FeatureFlag{}
}

func (s *Service) Services(ctx context.Context) []ServicePosture {
	_ = ctx
	return []ServicePosture{
		{Service: "dsh", State: StatePartiallyBound, EvidenceSource: "services/dsh/service.manifest.ts"},
		{Service: "wlt", State: StatePartiallyBound, EvidenceSource: "services/wlt/service.manifest.ts"},
		{Service: "identity", State: StateContractRequired, EvidenceSource: "core/identity runtime health not aggregated"},
		{Service: "providers", State: StateReadOnlyBound, EvidenceSource: "core/providers read endpoints"},
	}
}

func (s *Service) Health(ctx context.Context) HealthSnapshot {
	return HealthSnapshot{
		State:     StateUnknownHealth,
		CheckedAt: s.now().UTC(),
		Services:  s.Services(ctx),
	}
}

func (s *Service) AuditEvents(ctx context.Context) []AuditEvent {
	_ = ctx
	return []AuditEvent{}
}

func (s *Service) ChangeSets(ctx context.Context) []ChangeSet {
	_ = ctx
	return []ChangeSet{}
}
