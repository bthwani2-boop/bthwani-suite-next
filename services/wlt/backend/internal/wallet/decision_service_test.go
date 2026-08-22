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
	for _, raw := range []string{"not-a-boolean", "1", "0", "t", "f"} {
		t.Run(raw, func(t *testing.T) {
			t.Setenv(FinanceMutationKillSwitchEnv, raw)
			_, err := NewConfiguredDecisionServiceFromEnv()
			if !errors.Is(err, ErrDecisionConfigInvalid) {
				t.Fatalf("value %q: expected ErrDecisionConfigInvalid, got %v", raw, err)
			}
		})
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
	for _, actorID := range []string{"", "operator", "partner"} {
		if killed, err := service.IsCapabilityKilled(context.Background(), "finance_mutation", actorID); !killed || !errors.Is(err, ErrUnsupportedDecisionActor) {
			t.Fatalf("actor %q must fail closed, killed=%t err=%v", actorID, killed, err)
		}
	}
}
