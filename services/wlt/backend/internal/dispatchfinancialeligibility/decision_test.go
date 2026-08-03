package dispatchfinancialeligibility

import (
	"testing"
	"time"
)

func TestEvaluateFinancialEligibilityFailsClosedWithoutPolicy(t *testing.T) {
	now := time.Date(2026, 8, 3, 4, 0, 0, 0, time.UTC)
	result := evaluateFinancialEligibility(now, nil, nil, false)
	if result.Eligible || result.ReasonCode != "WLT_DISPATCH_POLICY_NOT_CONFIGURED" {
		t.Fatalf("unexpected decision: %+v", result)
	}
	if !result.ExpiresAt.Equal(now.Add(fallbackDecisionTTL)) {
		t.Fatalf("unexpected expiry: %s", result.ExpiresAt)
	}
}

func TestEvaluateFinancialEligibilityUsesCodThreshold(t *testing.T) {
	now := time.Date(2026, 8, 3, 4, 0, 0, 0, time.UTC)
	policy := &policyRecord{
		Enabled:                          true,
		RequireActiveWallet:              true,
		MinimumDispatchBalanceMinorUnits: 100,
		MinimumCODBalanceMinorUnits:      500,
		Currency:                         "YER",
		DecisionTTLSeconds:               120,
		PolicyVersion:                    "dispatch-balance@7",
	}
	wallet := &walletRecord{ID: "wallet-1", Status: "active", Currency: "YER", AvailableBalanceMinorUnits: 400}
	result := evaluateFinancialEligibility(now, policy, wallet, true)
	if result.Eligible || result.ReasonCode != "WLT_AVAILABLE_BALANCE_BELOW_REQUIRED" {
		t.Fatalf("unexpected COD decision: %+v", result)
	}
	if result.RequiredBalance == nil || *result.RequiredBalance != 500 {
		t.Fatalf("expected WLT COD threshold, got %+v", result.RequiredBalance)
	}
}

func TestEvaluateFinancialEligibilityReturnsAbstractEligibleDecision(t *testing.T) {
	now := time.Date(2026, 8, 3, 4, 0, 0, 0, time.UTC)
	policy := &policyRecord{
		Enabled:                          true,
		RequireActiveWallet:              true,
		MinimumDispatchBalanceMinorUnits: 100,
		MinimumCODBalanceMinorUnits:      500,
		Currency:                         "YER",
		DecisionTTLSeconds:               180,
		PolicyVersion:                    "dispatch-balance@8",
	}
	wallet := &walletRecord{ID: "wallet-1", Status: "active", Currency: "YER", AvailableBalanceMinorUnits: 700}
	result := evaluateFinancialEligibility(now, policy, wallet, true)
	if !result.Eligible || result.ReasonCode != "WLT_DISPATCH_FINANCIALLY_ELIGIBLE" {
		t.Fatalf("unexpected eligible decision: %+v", result)
	}
	if !result.ExpiresAt.Equal(now.Add(180 * time.Second)) {
		t.Fatalf("unexpected expiry: %s", result.ExpiresAt)
	}
}

func TestEvaluateFinancialEligibilityRejectsWalletCurrencyMismatch(t *testing.T) {
	now := time.Date(2026, 8, 3, 4, 0, 0, 0, time.UTC)
	policy := &policyRecord{
		Enabled:              true,
		RequireActiveWallet:  true,
		Currency:             "YER",
		DecisionTTLSeconds:   120,
		PolicyVersion:        "dispatch-balance@9",
	}
	wallet := &walletRecord{ID: "wallet-1", Status: "active", Currency: "USD", AvailableBalanceMinorUnits: 1000}
	result := evaluateFinancialEligibility(now, policy, wallet, false)
	if result.Eligible || result.ReasonCode != "WLT_WALLET_CURRENCY_MISMATCH" {
		t.Fatalf("unexpected currency decision: %+v", result)
	}
}
