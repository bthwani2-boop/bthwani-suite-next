package platformcontrol

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

type Service struct {
	repository   *Repository
	now          func() time.Time
	dependencies []ServiceDependency
	healthClient *http.Client
}

func NewService(repositories ...*Repository) *Service {
	var repository *Repository
	if len(repositories) > 0 {
		repository = repositories[0]
	}
	return &Service{
		repository:   repository,
		now:          time.Now,
		healthClient: &http.Client{Timeout: 4 * time.Second},
	}
}

func (s *Service) requireRepository() (*Repository, error) {
	if s.repository == nil {
		return nil, fmt.Errorf("platform repository is not configured")
	}
	return s.repository, nil
}

func (s *Service) Ready(ctx context.Context) error {
	repository, err := s.requireRepository()
	if err != nil {
		return err
	}
	return repository.Ready(ctx)
}

func (s *Service) RuntimeSnapshot(ctx context.Context) RuntimeSnapshot {
	generatedAt := s.now().UTC()
	if err := s.Ready(ctx); err != nil {
		return RuntimeSnapshot{
			Status:         StateFixRequired,
			Revision:       "platform-control-store-unavailable",
			GeneratedAt:    generatedAt,
			VariablesState: StateFixRequired,
			FlagsState:     StateFixRequired,
			RolloutsState:  StateFixRequired,
			HealthState:    StateFixRequired,
			AuditState:     StateFixRequired,
			RollbackState:  StateFixRequired,
			ServicesState:  StateFixRequired,
			Evidence: []string{
				"platform-control PostgreSQL store is unavailable",
				"no mutation or rollout is accepted without persistence, audit, health gates and rollback state",
			},
		}
	}

	services := s.Services(ctx)
	healthState := aggregateHealthState(services)
	rolloutsState := StateOperational
	rolloutEvidence := "progressive rollout persistence and state machine are active"
	if _, err := s.Rollouts(ctx); err != nil {
		rolloutsState = StateFixRequired
		rolloutEvidence = "progressive rollout store is unavailable"
	}

	status := StateOperational
	if healthState == StateFixRequired || rolloutsState == StateFixRequired {
		status = StateFixRequired
	} else if healthState != StateOperational {
		status = StatePartiallyBound
	}
	return RuntimeSnapshot{
		Status:         status,
		Revision:       "platform-control-p3-progressive-delivery",
		GeneratedAt:    generatedAt,
		VariablesState: StateOperational,
		FlagsState:     StateOperational,
		RolloutsState:  rolloutsState,
		HealthState:    healthState,
		AuditState:     StateOperational,
		RollbackState:  StateOperational,
		ServicesState:  healthState,
		Evidence: []string{
			"platform-control PostgreSQL store attached",
			"maker-checker change sets, optimistic concurrency, audit, apply and rollback are active",
			"service posture is computed from live health probes",
			rolloutEvidence,
		},
	}
}

func (s *Service) EffectiveRuntimeConfig(ctx context.Context) (EffectiveRuntimeConfig, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return EffectiveRuntimeConfig{}, err
	}
	return repository.EffectiveRuntimeConfig(ctx)
}

func (s *Service) Variables(ctx context.Context) ([]Variable, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return nil, err
	}
	return repository.Variables(ctx)
}

func (s *Service) GetVariable(ctx context.Context, key, scopeType, scopeID string) (Variable, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Variable{}, err
	}
	return repository.GetVariable(ctx, key, scopeType, scopeID)
}

func (s *Service) FeatureFlags(ctx context.Context) ([]FeatureFlag, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return nil, err
	}
	return repository.FeatureFlags(ctx)
}

func (s *Service) AuditEvents(ctx context.Context) ([]AuditEvent, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return nil, err
	}
	return repository.AuditEvents(ctx)
}

func (s *Service) ChangeSets(ctx context.Context) ([]ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return nil, err
	}
	return repository.ChangeSets(ctx)
}

func (s *Service) GetChangeSet(ctx context.Context, id string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.GetChangeSet(ctx, id)
}

func (s *Service) CreateChangeSet(ctx context.Context, actorID string, roles []string, correlationID string, input CreateChangeSetInput) (ChangeSet, error) {
	if err := validateCreateInput(input); err != nil {
		return ChangeSet{}, err
	}
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.CreateChangeSet(ctx, actorID, roles, correlationID, input)
}

func (s *Service) ValidateChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.ValidateChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) SubmitChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.SubmitChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) ApproveChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.ApproveChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) RejectChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID, reason string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.RejectChangeSet(ctx, id, actorID, roles, correlationID, reason)
}

func (s *Service) ApplyChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.ApplyChangeSet(ctx, id, actorID, roles, correlationID)
}

func (s *Service) RollbackChangeSet(ctx context.Context, id, actorID string, roles []string, correlationID string) (ChangeSet, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return ChangeSet{}, err
	}
	return repository.RollbackChangeSet(ctx, id, actorID, roles, correlationID)
}
