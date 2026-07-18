package promotionfunding

import "testing"

func TestValidateReserve(t *testing.T) {
	t.Parallel()

	valid := normalizeReserve(ReserveInput{
		TenantID: "tenant-1", ExternalReference: "dsh:redemption-1",
		CheckoutIntentID: "checkout-1", CouponRedemptionID: "redemption-1",
		CouponID: "coupon-1", ClientID: "client-1",
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		PartnerID: "partner-1", TotalDiscountMinorUnits: 1000,
		Currency: "yer", IdempotencyKey: "key-1", CorrelationID: "corr-1",
	})
	if err := validateReserve(valid); err != nil {
		t.Fatalf("valid reserve rejected: %v", err)
	}
	if valid.Currency != "YER" {
		t.Fatalf("currency was not normalized: %q", valid.Currency)
	}

	tests := []struct {
		name  string
		mutate func(*ReserveInput)
	}{
		{name: "split mismatch", mutate: func(input *ReserveInput) { input.TotalDiscountMinorUnits = 999 }},
		{name: "partner missing", mutate: func(input *ReserveInput) { input.PartnerID = "" }},
		{name: "partner forbidden for platform only", mutate: func(input *ReserveInput) {
			input.PlatformFundedMinorUnits = 1000
			input.PartnerFundedMinorUnits = 0
			input.PartnerID = "partner-1"
		}},
		{name: "idempotency missing", mutate: func(input *ReserveInput) { input.IdempotencyKey = "" }},
		{name: "correlation missing", mutate: func(input *ReserveInput) { input.CorrelationID = "" }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			candidate := valid
			tt.mutate(&candidate)
			if err := validateReserve(candidate); err == nil {
				t.Fatalf("invalid reserve accepted: %+v", candidate)
			}
		})
	}
}

func TestSameReserveIncludesFinancialIdentity(t *testing.T) {
	t.Parallel()
	partner := "partner-1"
	existing := &Reservation{
		TenantID: "tenant-1", ExternalReference: "dsh:redemption-1",
		CheckoutIntentID: "checkout-1", CouponRedemptionID: "redemption-1",
		CouponID: "coupon-1", ClientID: "client-1", PartnerID: &partner,
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER",
	}
	input := ReserveInput{
		TenantID: existing.TenantID, ExternalReference: existing.ExternalReference,
		CheckoutIntentID: existing.CheckoutIntentID, CouponRedemptionID: existing.CouponRedemptionID,
		CouponID: existing.CouponID, ClientID: existing.ClientID, PartnerID: partner,
		PlatformFundedMinorUnits: 600, PartnerFundedMinorUnits: 400,
		TotalDiscountMinorUnits: 1000, Currency: "YER",
	}
	if !sameReserve(existing, input) {
		t.Fatal("identical reserve was not idempotent")
	}
	input.PartnerFundedMinorUnits = 399
	if sameReserve(existing, input) {
		t.Fatal("changed financial split was treated as idempotent")
	}
}
