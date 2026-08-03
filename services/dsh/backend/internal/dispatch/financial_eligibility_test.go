package dispatch

import (
	"strings"
	"testing"
	"time"
)

func TestNormalizeCaptainWltFinancialDecision(t *testing.T) {
	evaluatedAt := time.Now().UTC().Add(-time.Second)
	expiresAt := evaluatedAt.Add(2 * time.Minute)
	decision, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		WltDecisionID: " wlt-decision-1 ",
		ReasonCode:    " WLT_DISPATCH_FINANCIALLY_ELIGIBLE ",
		PolicyVersion: " dispatch-balance@8 ",
		Eligible:      true,
		EvaluatedAt:   evaluatedAt,
		ExpiresAt:     expiresAt,
	})
	if err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	if decision.WltDecisionID != "wlt-decision-1" {
		t.Fatalf("decision id was not normalized: %+v", decision)
	}
	if decision.ReasonCode != "WLT_DISPATCH_FINANCIALLY_ELIGIBLE" || decision.PolicyVersion != "dispatch-balance@8" {
		t.Fatalf("decision metadata was not normalized: %+v", decision)
	}
	if !decision.EvaluatedAt.Equal(evaluatedAt) || !decision.ExpiresAt.Equal(expiresAt) {
		t.Fatalf("decision time window changed: %+v", decision)
	}
}

func TestNormalizeCaptainWltFinancialDecisionRejectsMissingMetadata(t *testing.T) {
	now := time.Now().UTC()
	_, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		Eligible: true, EvaluatedAt: now, ExpiresAt: now.Add(time.Minute),
	})
	if err == nil || !strings.Contains(err.Error(), "WLT financial eligibility decision metadata") {
		t.Fatalf("expected missing metadata error, got %v", err)
	}
}

func TestNormalizeCaptainWltFinancialDecisionRejectsInvalidTimeWindow(t *testing.T) {
	now := time.Now().UTC()
	_, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		WltDecisionID: "decision",
		ReasonCode:    "WLT_DISPATCH_FINANCIALLY_ELIGIBLE",
		PolicyVersion: "dispatch-balance@8",
		Eligible:      true,
		EvaluatedAt:   now,
		ExpiresAt:     now,
	})
	if err == nil || !strings.Contains(err.Error(), "time window") {
		t.Fatalf("expected time-window error, got %v", err)
	}
}

func TestNormalizeCaptainWltFinancialDecisionRejectsExpiredDecision(t *testing.T) {
	now := time.Now().UTC()
	_, err := normalizeCaptainWltFinancialDecision(CaptainWltFinancialEligibilityDecision{
		WltDecisionID: "decision",
		ReasonCode:    "WLT_DISPATCH_FINANCIALLY_ELIGIBLE",
		PolicyVersion: "dispatch-balance@8",
		Eligible:      true,
		EvaluatedAt:   now.Add(-2 * time.Minute),
		ExpiresAt:     now.Add(-time.Minute),
	})
	if err == nil || !strings.Contains(err.Error(), "expired") {
		t.Fatalf("expected expired-decision error, got %v", err)
	}
}
