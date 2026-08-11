package wallet

import (
	"context"
	"errors"
	"os"
	"strconv"
	"strings"
)

const FinanceMutationKillSwitchEnv = "WLT_FINANCE_MUTATION_KILL_SWITCH"

var (
	ErrDecisionConfigMissing     = errors.New("financial kill-switch configuration is required")
	ErrDecisionConfigInvalid     = errors.New("financial kill-switch configuration must be true or false")
	ErrUnsupportedCapability     = errors.New("unsupported financial kill-switch capability")
	ErrDecisionActorRequired     = errors.New("financial kill-switch actor is required")
)

// ConfiguredDecisionService is the runtime authority for the financial
// mutation kill switch. The decision is explicit configuration: startup fails
// if the value is absent or invalid, while the request path still fails closed
// if the service cannot answer a supported decision.
type ConfiguredDecisionService struct {
	financeMutationKilled bool
}

func NewConfiguredDecisionServiceFromEnv() (*ConfiguredDecisionService, error) {
	raw, ok := os.LookupEnv(FinanceMutationKillSwitchEnv)
	if !ok || strings.TrimSpace(raw) == "" {
		return nil, ErrDecisionConfigMissing
	}
	killed, err := strconv.ParseBool(strings.TrimSpace(raw))
	if err != nil {
		return nil, ErrDecisionConfigInvalid
	}
	return &ConfiguredDecisionService{financeMutationKilled: killed}, nil
}

func (s *ConfiguredDecisionService) IsCapabilityKilled(_ context.Context, capability string, actorID string) (bool, error) {
	if s == nil {
		return true, ErrDecisionConfigMissing
	}
	if strings.TrimSpace(actorID) == "" {
		return true, ErrDecisionActorRequired
	}
	if strings.TrimSpace(capability) != "finance_mutation" {
		return true, ErrUnsupportedCapability
	}
	return s.financeMutationKilled, nil
}
