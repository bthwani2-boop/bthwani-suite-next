package coupons

import (
	"errors"
	"testing"

	"dsh-api/internal/wlt"
)

func baseFundingDiagnostic() FundingLifecycleDiagnostic {
	return FundingLifecycleDiagnostic{
		RedemptionID: "redemption-1", CouponID: "coupon-1",
		CheckoutIntentID: "checkout-1", TenantID: "tenant-1",
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER",
		DSHStatus: "committed", WLTReservationID: "pfr_123",
	}
}

func TestReconcileFundingLifecycle(t *testing.T) {
	t.Parallel()
	matching := baseFundingDiagnostic()
	ReconcileFundingLifecycle(&matching, &wlt.PromotionFundingReservation{
		ID: "pfr_123", TenantID: "tenant-1", CouponRedemptionID: "redemption-1",
		CouponID: "coupon-1", CheckoutIntentID: "checkout-1",
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER", Status: "committed",
	}, nil)
	if matching.ReconciliationStatus != "reconciled" {
		t.Fatalf("matching state=%q, want reconciled", matching.ReconciliationStatus)
	}

	mismatch := baseFundingDiagnostic()
	ReconcileFundingLifecycle(&mismatch, &wlt.PromotionFundingReservation{
		ID: "pfr_123", TenantID: "tenant-1", CouponRedemptionID: "redemption-1",
		CouponID: "coupon-1", CheckoutIntentID: "checkout-1",
		PlatformFundedMinorUnits: 700, PartnerFundedMinorUnits: 300,
		TotalDiscountMinorUnits: 1000, Currency: "YER", Status: "committed",
	}, nil)
	if mismatch.ReconciliationStatus != "mismatch" {
		t.Fatalf("changed split state=%q, want mismatch", mismatch.ReconciliationStatus)
	}

	unavailable := baseFundingDiagnostic()
	ReconcileFundingLifecycle(&unavailable, nil, errors.New("WLT unavailable"))
	if unavailable.ReconciliationStatus != "wlt_unavailable" {
		t.Fatalf("unavailable state=%q, want wlt_unavailable", unavailable.ReconciliationStatus)
	}
}
