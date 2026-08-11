package wallet

import (
	"context"
	"errors"
	"testing"
)

func TestConfiguredDecisionServiceRequiresExplicitConfiguration(t *testing.T) {
	t.Setenv(FinanceMutationKillSwitchEnv, "")
	_, err := NewConfiguredDecisionServiceFromEnv()
	if !errors.Is(err, ErrDecisionConfigMissing) {
		t.Fatalf("expected ErrDecisionConfigMissing, got %v", err)
	}
}

func TestConfiguredDecisionServiceRejectsInvalidConfiguration(t *testing.T) {
	t.Setenv(FinanceMutationKillSwitchEnv, "not-a-boolean")
	_, err := NewConfiguredDecisionServiceFromEnv()
	if !errors.Is(err, ErrDecisionConfigInvalid) {
		t.Fatalf("expected ErrDecisionConfigInvalid, got %v", err)
	}
}

func TestConfiguredDecisionServiceAllowsExplicitlyOpenFinancialMutation(t *testing.T) {
	t.Setenv(FinanceMutationKillSwitchEnv, "false")
	service, err := NewConfiguredDecisionServiceFromEnv()
	if err != nil {
		t.Fatalf("create configured decision service: %v", err)
	}
	killed, err := service.IsCapabilityKilled(context.Background(), "finance_mutation", "service")
	if err != nil {
		t.Fatalf("resolve configured decision: %v", err)
	}
	if killed {
		t.Fatal("expected finance_mutation to be open")
	}
}

func TestConfiguredDecisionServiceBlocksExplicitlyKilledFinancialMutation(t *testing.T) {
	t.Setenv(FinanceMutationKillSwitchEnv, "true")
	service, err := NewConfiguredDecisionServiceFromEnv()
	if err != nil {
		t.Fatalf("create configured decision service: %v", err)
	}
	killed, err := service.IsCapabilityKilled(context.Background(), "finance_mutation", "service")
	if err != nil {
		t.Fatalf("resolve configured decision: %v", err)
	}
	if !killed {
		t.Fatal("expected finance_mutation to be killed")
	}
}

func TestConfiguredDecisionServiceFailsClosedForUnknownCapabilityOrActor(t *testing.T) {
	t.Setenv(FinanceMutationKillSwitchEnv, "false")
	service, err := NewConfiguredDecisionServiceFromEnv()
	if err != nil {
		t.Fatalf("create configured decision service: %v", err)
	}
	if killed, err := service.IsCapabilityKilled(context.Background(), "unknown", "service"); !killed || !errors.Is(err, ErrUnsupportedCapability) {
		t.Fatalf("unknown capability must fail closed, killed=%t err=%v", killed, err)
	}
	if killed, err := service.IsCapabilityKilled(context.Background(), "finance_mutation", ""); !killed || !errors.Is(err, ErrDecisionActorRequired) {
		t.Fatalf("missing actor must fail closed, killed=%t err=%v", killed, err)
	}
}
