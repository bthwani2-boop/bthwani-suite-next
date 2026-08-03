package dispatch

import (
	"strings"
	"testing"
	"time"
)

func TestNormalizeCaptainWltFinancialDecision(t *testing.T) {
	evaluatedAt := time.Date(2026, 8, 3, 3, 0, 0, 0, time.UTC)
	decision, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		WltDecisionID:    " wlt-decision-1 ",
		WltReasonCode:    " WLT_WALLET_ACTIVE ",
		WltPolicyVersion: " wallet-status@1 ",
		Eligible:         true,
		EvaluatedAt:      evaluatedAt,
		TTLSeconds:       120,
	})
	if err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	if decision.WltDecisionID != "wlt-decision-1" || decision.SnapshotReference != "wlt-decision-1" {
		t.Fatalf("decision identifiers were not normalized: %+v", decision)
	}
	if decision.WltReasonCode != "WLT_WALLET_ACTIVE" || decision.WltPolicyVersion != "wallet-status@1" {
		t.Fatalf("decision metadata was not normalized: %+v", decision)
	}
	if !decision.EvaluatedAt.Equal(evaluatedAt) {
		t.Fatalf("evaluatedAt changed: %s", decision.EvaluatedAt)
	}
}

func TestNormalizeCaptainWltFinancialDecisionRejectsMissingMetadata(t *testing.T) {
	_, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{Eligible: true, TTLSeconds: 120})
	if err == nil || !strings.Contains(err.Error(), "WLT financial eligibility decision metadata") {
		t.Fatalf("expected missing metadata error, got %v", err)
	}
}

func TestNormalizeCaptainWltFinancialDecisionRejectsInvalidTtl(t *testing.T) {
	_, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		WltDecisionID:    "decision",
		WltReasonCode:    "WLT_WALLET_ACTIVE",
		WltPolicyVersion: "wallet-status@1",
		Eligible:         true,
		TTLSeconds:       10,
	})
	if err == nil || !strings.Contains(err.Error(), "ttl") {
		t.Fatalf("expected ttl error, got %v", err)
	}
}

func TestNormalizeCaptainWltFinancialDecisionCopiesReasonForIneligibleDecision(t *testing.T) {
	decision, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		WltDecisionID:    "decision",
		WltReasonCode:    "WLT_WALLET_NOT_ACTIVE",
		WltPolicyVersion: "wallet-status@1",
		Eligible:         false,
		TTLSeconds:       120,
	})
	if err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	if decision.IneligibilityReason != "WLT_WALLET_NOT_ACTIVE" {
		t.Fatalf("expected WLT reason copy, got %q", decision.IneligibilityReason)
	}
}
