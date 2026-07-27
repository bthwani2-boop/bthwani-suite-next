package dispatch

import "testing"

func TestEvaluateCaptainFinancialEligibility(t *testing.T) {
	requirement := DispatchBalanceRequirement{
		Enabled:                          true,
		RequirePositiveBalance:           true,
		MinimumDispatchBalanceMinorUnits: 50000,
		Currency:                         "YER",
		SnapshotTTLSeconds:               120,
	}

	cases := []struct {
		name       string
		wallet     CaptainWalletReadback
		eligible   bool
		reason     string
		minimum    int64
	}{
		{
			name: "eligible funded wallet",
			wallet: CaptainWalletReadback{WalletStatus: "active", AvailableBalanceMinorUnits: 75000, Currency: "YER"},
			eligible: true,
			minimum: 50000,
		},
		{
			name: "below minimum",
			wallet: CaptainWalletReadback{WalletStatus: "active", AvailableBalanceMinorUnits: 49999, Currency: "YER"},
			eligible: false,
			reason: "CAPTAIN_FINANCIAL_GUARANTEE_BELOW_MINIMUM",
			minimum: 50000,
		},
		{
			name: "inactive wallet",
			wallet: CaptainWalletReadback{WalletStatus: "suspended", AvailableBalanceMinorUnits: 90000, Currency: "YER"},
			eligible: false,
			reason: "CAPTAIN_WALLET_NOT_ACTIVE",
			minimum: 50000,
		},
		{
			name: "currency mismatch",
			wallet: CaptainWalletReadback{WalletStatus: "active", AvailableBalanceMinorUnits: 90000, Currency: "USD"},
			eligible: false,
			reason: "CAPTAIN_WALLET_CURRENCY_MISMATCH",
			minimum: 50000,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			eligible, reason, minimum := EvaluateCaptainFinancialEligibility(requirement, tc.wallet)
			if eligible != tc.eligible || reason != tc.reason || minimum != tc.minimum {
				t.Fatalf("got eligible=%v reason=%q minimum=%d", eligible, reason, minimum)
			}
		})
	}
}

func TestEvaluateCaptainFinancialEligibilityPositiveFloor(t *testing.T) {
	eligible, reason, minimum := EvaluateCaptainFinancialEligibility(
		DispatchBalanceRequirement{
			Enabled:                          true,
			RequirePositiveBalance:           true,
			MinimumDispatchBalanceMinorUnits: 0,
			Currency:                         "YER",
		},
		CaptainWalletReadback{WalletStatus: "active", AvailableBalanceMinorUnits: 0, Currency: "YER"},
	)
	if eligible || reason != "CAPTAIN_FINANCIAL_GUARANTEE_BELOW_MINIMUM" || minimum != 1 {
		t.Fatalf("expected positive-balance floor, got eligible=%v reason=%q minimum=%d", eligible, reason, minimum)
	}
}

func TestDisabledBalancePolicyStillRequiresActiveWallet(t *testing.T) {
	requirement := DispatchBalanceRequirement{Enabled: false, Currency: "YER"}
	eligible, reason, _ := EvaluateCaptainFinancialEligibility(
		requirement,
		CaptainWalletReadback{WalletStatus: "suspended", Currency: "YER"},
	)
	if eligible || reason != "CAPTAIN_WALLET_NOT_ACTIVE" {
		t.Fatalf("disabled threshold must not accept an inactive WLT wallet: eligible=%v reason=%q", eligible, reason)
	}
}
