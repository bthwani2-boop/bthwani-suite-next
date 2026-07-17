package platformcontrol

import (
	"context"
	"fmt"
	"time"
)

type Service struct {
	repository *Repository
	now        func() time.Time
}

func NewService(repositories ...*Repository) *Service {
	var repository *Repository
	if len(repositories) > 0 {
		repository = repositories[0]
	}
	return &Service{repository: repository, now: time.Now}
}

func (s *Service) Ready(ctx context.Context) error {
	if s.repository == nil {
		return fmt.Errorf("platform repository is not configured")
	}
	return s.repository.Ready(ctx)
}

func (s *Service) RuntimeSnapshot(ctx context.Context) RuntimeSnapshot {
	if err := s.Ready(ctx); err != nil {
		return RuntimeSnapshot{
			Status:         StateFixRequired,
			Revision:       "platform-control-store-unavailable",
			GeneratedAt:    s.now().UTC(),
			VariablesState: StateFixRequired,
			FlagsState:     StateFixRequired,
			RolloutsState:  StateContractRequired,
			HealthState:    StateUnknownHealth,
			AuditState:     StateFixRequired,
			RollbackState:  StateFixRequired,
			ServicesState:  StatePartiallyBound,
			Evidence: []string{
				"platform-control PostgreSQL store is unavailable",
				"no mutation is accepted without persistent audit and rollback state",
			},
		}
	}

	return RuntimeSnapshot{
		Status:         StateOperational,
		Revision:       "platform-control-p2-governed-store",
		GeneratedAt:    s.now().UTC(),
		VariablesState: StateOperational,
		FlagsState:     StateOperational,
		RolloutsState:  StateContractRequired,
		HealthState:    StatePartiallyBound,
		AuditState:     StateOperational,
		RollbackState:  StateOperational,
		ServicesState:  StatePartiallyBound,
		Evidence: []string{
			"platform-control PostgreSQL store attached",
			"maker-checker change sets, optimistic concurrency, audit, apply and rollback are active",
			"progressive rollout orchestration remains contract-required",
		},
	}
}

func (s *Service) EffectiveRuntimeConfig(ctx context.Context) (EffectiveRuntimeConfig, error) {
	if s.repository == nil {
		return EffectiveRuntimeConfig{}, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.EffectiveRuntimeConfig(ctx)
}

func (s *Service) Variables(ctx context.Context) ([]Variable, error) {
	if s.repository == nil {
		return nil, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.Variables(ctx)
}

func (s *Service) FeatureFlags(ctx context.Context) ([]FeatureFlag, error) {
	if s.repository == nil {
		return nil, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.FeatureFlags(ctx)
}

func (s *Service) Services(ctx context.Context) []ServicePosture {
	platformState := StateOperational
	platformEvidence := "core/platform-control PostgreSQL and governed workflow"
	if err := s.Ready(ctx); err != nil {
		platformState = StateFixRequired
		platformEvidence = "core/platform-control database unavailable"
	}
	return []ServicePosture{
		{Service: "platform-control", State: platformState, EvidenceSource: platformEvidence},
		{Service: "dsh", State: StatePartiallyBound, EvidenceSource: "services/dsh/service.manifest.ts"},
		{Service: "wlt", State: StatePartiallyBound, EvidenceSource: "services/wlt/service.manifest.ts"},
		{Service: "identity", State: StatePartiallyBound, EvidenceSource: "identity session dependency is active; health aggregation pending"},
		{Service: "providers", State: StateReadOnlyBound, EvidenceSource: "core/providers read endpoints"},
	}
}

func (s *Service) Health(ctx context.Context) HealthSnapshot {
	state := StatePartiallyBound
	if err := s.Ready(ctx); err != nil {
		state = StateFixRequired
	}
	return HealthSnapshot{
		State:     state,
		CheckedAt: s.now().UTC(),
		Services:  s.Services(ctx),
	}
}

func (s *Service) AuditEvents(ctx context.Context) ([]AuditEvent, error) {
	if s.repository == nil {
		return nil, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.AuditEvents(ctx)
}

func (s *Service) ChangeSets(ctx context.Context) ([]ChangeSet, error) {
	if s.repository == nil {
		return nil, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.ChangeSets(ctx)
}

func (s *Service) GetChangeSet(ctx context.Context, id string) (ChangeSet, error) {
	if s.repository == nil {
		return ChangeSet{}, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.GetChangeSet(ctx, id)
}

func (s *Service) CreateChangeSet(
	ctx context.Context,
	actorID string,
	roles []string,
	correlationID string,
	input CreateChangeSetInput,
) (ChangeSet, error) {
	if err := validateCreateInput(input); err != nil {
		return ChangeSet{}, err
	}
	if s.repository == nil {
		return ChangeSet{}, fmt.Errorf("platform repository is not configured")
	}
	return s.repository.CreateChangeSet(ctx, actorID, roles, correlationID, input)
}

func (s *Service) ValidateChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return s.repository.ValidateChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) SubmitChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return s.repository.SubmitChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) ApproveChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return s.repository.ApproveChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) RejectChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID, reason string) (ChangeSet, error) {
	return s.repository.RejectChangeSet(ctx, id, actorID, roles, correlationID, reason)
}

func (s *Service) ApplyChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return s.repository.ApplyChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) RollbackChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	return s.repository.RollbackChangeSet(ctx, id, actorID, roles, correlationID)
}
