package platformcontrol

import "context"

func (s *Service) Rollouts(ctx context.Context) ([]Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return nil, err
	}
	return repository.Rollouts(ctx)
}

func (s *Service) GetRollout(ctx context.Context, id string) (Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.GetRollout(ctx, id)
}

func (s *Service) CreateRollout(
	ctx context.Context,
	actorID string,
	roles []string,
	correlationID string,
	input CreateRolloutInput,
) (Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.CreateRollout(ctx, actorID, roles, correlationID, input)
}

func (s *Service) AdvanceRollout(
	ctx context.Context,
	id string,
	actorID string,
	roles []string,
	correlationID string,
) (Rollout, error) {
	if s.Health(ctx).State != StateOperational {
		return Rollout{}, ErrHealthGate
	}
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.AdvanceRollout(ctx, id, actorID, roles, correlationID)
}

func (s *Service) PauseRollout(
	ctx context.Context,
	id string,
	actorID string,
	roles []string,
	correlationID string,
) (Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.PauseRollout(ctx, id, actorID, roles, correlationID)
}

func (s *Service) AbortRollout(
	ctx context.Context,
	id string,
	actorID string,
	roles []string,
	correlationID string,
) (Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.AbortRollout(ctx, id, actorID, roles, correlationID)
}

func (s *Service) RollbackRollout(
	ctx context.Context,
	id string,
	actorID string,
	roles []string,
	correlationID string,
) (Rollout, error) {
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	return repository.RollbackRollout(ctx, id, actorID, roles, correlationID)
}
