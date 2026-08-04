package store

import (
	"context"
	"errors"
)

var (
	ErrKillSwitchActive = errors.New("operation blocked by central kill switch")
)

type DecisionService interface {
	IsCapabilityKilled(ctx context.Context, capability string, actorID string) (bool, error)
}

func EnforceKillSwitch(ctx context.Context, ds DecisionService, capability, actorID string) error {
	if ds == nil {
		// Fail closed if no decision service
		return ErrKillSwitchActive
	}
	killed, err := ds.IsCapabilityKilled(ctx, capability, actorID)
	if err != nil {
		// Fail closed on error checking decision
		return ErrKillSwitchActive
	}
	if killed {
		return ErrKillSwitchActive
	}
	return nil
}
