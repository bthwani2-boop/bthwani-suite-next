package wallet

import (
	"context"
	"errors"
	"os"
	"strings"
)

const FinanceMutationKillSwitchEnv = "WLT_FINANCE_MUTATION_KILL_SWITCH"

var (
	ErrDecisionConfigMissing    = errors.New("financial kill-switch configuration is required")
	ErrDecisionConfigInvalid    = errors.New("financial kill-switch configuration must be true or false")
	ErrUnsupportedCapability    = errors.New("unsupported financial kill-switch capability")
	ErrUnsupportedDecisionActor = errors.New("unsupported financial kill-switch actor")
)

// ConfiguredDecisionService is the runtime authority for the financial
// mutation kill switch. The decision is explicit configuration: startup fails
// if the value is absent or invalid, while the request path still fails closed
// if the service cannot answer the exact governed decision key.
type ConfiguredDecisionService struct {
	financeMutationKilled bool
}

func NewConfiguredDecisionServiceFromEnv() (*ConfiguredDecisionService, error) {
	raw, ok := os.LookupEnv(FinanceMutationKillSwitchEnv)
	if !ok {
		return nil, ErrDecisionConfigMissing
	}
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "true":
		return &ConfiguredDecisionService{financeMutationKilled: true}, nil
	case "false":
		return &ConfiguredDecisionService{financeMutationKilled: false}, nil
	case "":
		return nil, ErrDecisionConfigMissing
	default:
		return nil, ErrDecisionConfigInvalid
	}
}

func (s *ConfiguredDecisionService) IsCapabilityKilled(_ context.Context, capability string, actorID string) (bool, error) {
	if s == nil {
		return true, ErrDecisionConfigMissing
	}
	if strings.TrimSpace(capability) != "finance_mutation" {
		return true, ErrUnsupportedCapability
	}
	if strings.TrimSpace(actorID) != "service" {
		return true, ErrUnsupportedDecisionActor
	}
	return s.financeMutationKilled, nil
}
