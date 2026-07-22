package wlt

import "testing"

func TestValidatePromotionFundingReserveResponse(t *testing.T) {
	t.Parallel()
	partnerID := "partner-1"
	input := ReservePromotionFundingInput{
		TenantID: "tenant-1", ExternalReference: "dsh:redemption-1",
		CheckoutIntentID: "checkout-1", CouponRedemptionID: "redemption-1",
		CouponID: "coupon-1", ClientID: "client-1", PartnerID: partnerID,
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER",
	}
	matching := &PromotionFundingReservation{
		ID: "pfr_1", TenantID: input.TenantID, ExternalReference: input.ExternalReference,
		CheckoutIntentID: input.CheckoutIntentID, CouponRedemptionID: input.CouponRedemptionID,
		CouponID: input.CouponID, ClientID: input.ClientID, PartnerID: &partnerID,
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER", Status: "reserved",
	}
	if err := validatePromotionFundingReserveResponse(matching, input); err != nil {
		t.Fatalf("matching reserve response rejected: %v", err)
	}

	mismatched := *matching
	mismatched.TenantID = "tenant-2"
	if err := validatePromotionFundingReserveResponse(&mismatched, input); err == nil {
		t.Fatal("cross-tenant reserve response was accepted")
	}

	mismatched = *matching
	mismatched.PlatformFundedMinorUnits = 700
	mismatched.PartnerFundedMinorUnits = 300
	if err := validatePromotionFundingReserveResponse(&mismatched, input); err == nil {
		t.Fatal("changed funding split was accepted")
	}
}

func TestValidatePromotionFundingTransitionResponse(t *testing.T) {
	t.Parallel()
	orderID := "order-1"
	input := PromotionFundingTransitionInput{TenantID: "tenant-1", OrderID: orderID}
	matching := &PromotionFundingReservation{
		ID: "pfr_1", TenantID: "tenant-1", Status: "committed", OrderID: &orderID,
	}
	if err := validatePromotionFundingTransitionResponse(matching, "pfr_1", "commit", input); err != nil {
		t.Fatalf("matching transition response rejected: %v", err)
	}

	wrongState := *matching
	wrongState.Status = "reserved"
	if err := validatePromotionFundingTransitionResponse(&wrongState, "pfr_1", "commit", input); err == nil {
		t.Fatal("unexpected WLT transition state was accepted")
	}

	wrongOrderID := "order-2"
	wrongOrder := *matching
	wrongOrder.OrderID = &wrongOrderID
	if err := validatePromotionFundingTransitionResponse(&wrongOrder, "pfr_1", "commit", input); err == nil {
		t.Fatal("different order response was accepted")
	}
}
