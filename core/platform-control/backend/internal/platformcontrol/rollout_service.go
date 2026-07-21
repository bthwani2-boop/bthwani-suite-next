package platformcontrol

import (
	"context"
	"fmt"
)

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
	if err := validateHealthGate(input.HealthGate); err != nil {
		return Rollout{}, err
	}
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
	repository, err := s.requireRepository()
	if err != nil {
		return Rollout{}, err
	}
	rollout, err := repository.GetRollout(ctx, id)
	if err != nil {
		return Rollout{}, err
	}
	if err := evaluateHealthGate(s.Health(ctx), rollout.HealthGate); err != nil {
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

func validateHealthGate(gate map[string]any) error {
	if gate == nil {
		return ErrValidation
	}
	requiredState, ok := gate["requiredState"].(string)
	if !ok || requiredState != string(StateOperational) {
		return ErrValidation
	}
	if rawServices, exists := gate["requiredServices"]; exists {
		services, ok := stringSlice(rawServices)
		if !ok || len(services) == 0 {
			return ErrValidation
		}
	}
	if rawLatency, exists := gate["maxLatencyMs"]; exists {
		latency, ok := numericValue(rawLatency)
		if !ok || latency <= 0 {
			return ErrValidation
		}
	}
	return nil
}

func evaluateHealthGate(snapshot HealthSnapshot, gate map[string]any) error {
	if err := validateHealthGate(gate); err != nil {
		return err
	}
	if snapshot.State != StateOperational {
		return fmt.Errorf("%w: aggregate state is %s", ErrHealthGate, snapshot.State)
	}

	requiredServices := make([]string, 0, len(snapshot.Services))
	if rawServices, exists := gate["requiredServices"]; exists {
		services, _ := stringSlice(rawServices)
		requiredServices = services
	}
	maxLatency := float64(0)
	if rawLatency, exists := gate["maxLatencyMs"]; exists {
		maxLatency, _ = numericValue(rawLatency)
	}

	byName := make(map[string]ServicePosture, len(snapshot.Services))
	for _, service := range snapshot.Services {
		byName[service.Service] = service
	}
	for _, name := range requiredServices {
		service, exists := byName[name]
		if !exists {
			return fmt.Errorf("%w: required service %s is absent", ErrHealthGate, name)
		}
		if service.State != StateOperational {
			return fmt.Errorf("%w: required service %s is %s", ErrHealthGate, name, service.State)
		}
		if maxLatency > 0 && float64(service.LatencyMS) > maxLatency {
			return fmt.Errorf("%w: required service %s latency %dms exceeds %.0fms", ErrHealthGate, name, service.LatencyMS, maxLatency)
		}
	}
	return nil
}

func stringSlice(value any) ([]string, bool) {
	switch typed := value.(type) {
	case []string:
		return typed, true
	case []any:
		result := make([]string, 0, len(typed))
		for _, item := range typed {
			text, ok := item.(string)
			if !ok || text == "" {
				return nil, false
			}
			result = append(result, text)
		}
		return result, true
	default:
		return nil, false
	}
}

func numericValue(value any) (float64, bool) {
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case int32:
		return float64(typed), true
	default:
		return 0, false
	}
}
