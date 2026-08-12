package store

import (
	"context"
	"errors"
	"os"
	"strings"
)

const DispatchAssignmentKillSwitchEnv = "DSH_DISPATCH_ASSIGNMENT_KILL_SWITCH"

var (
	ErrDispatchDecisionConfigMissing = errors.New("dispatch-assignment kill-switch configuration is required")
	ErrDispatchDecisionConfigInvalid = errors.New("dispatch-assignment kill-switch configuration must be true or false")
)

// ConfiguredDispatchDecisionService is the DSH-owned decision adapter for the
// dispatch mutation gate. Local development explicitly opens it through the
// runtime env; every other environment fails closed when the setting is absent
// or malformed.
type ConfiguredDispatchDecisionService struct {
	killed bool
}

func NewConfiguredDispatchDecisionServiceFromEnv() (*ConfiguredDispatchDecisionService, error) {
	raw, ok := os.LookupEnv(DispatchAssignmentKillSwitchEnv)
	if !ok || strings.TrimSpace(raw) == "" {
		return nil, ErrDispatchDecisionConfigMissing
	}
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "true":
		return &ConfiguredDispatchDecisionService{killed: true}, nil
	case "false":
		return &ConfiguredDispatchDecisionService{killed: false}, nil
	default:
		return nil, ErrDispatchDecisionConfigInvalid
	}
}

func (s *ConfiguredDispatchDecisionService) IsCapabilityKilled(_ context.Context, capability string, _ string) (bool, error) {
	if s == nil {
		return true, ErrDispatchDecisionConfigMissing
	}
	if strings.TrimSpace(capability) != "dispatch_assignment" {
		return true, errors.New("unsupported dispatch-assignment capability")
	}
	return s.killed, nil
}

type failClosedDecisionService struct{ err error }

func (s failClosedDecisionService) IsCapabilityKilled(_ context.Context, _ string, _ string) (bool, error) {
	if s.err == nil {
		return true, ErrDispatchDecisionConfigMissing
	}
	return true, s.err
}

func FailClosedDecisionService(err error) DecisionService {
	return failClosedDecisionService{err: err}
}
