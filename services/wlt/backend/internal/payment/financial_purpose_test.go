package payment

import "testing"

func TestDerivePaymentSessionPurpose(t *testing.T) {
	cases := []struct {
		name    string
		source  SessionSource
		want    FinancialPurpose
		wantErr bool
	}{
		{"checkout intent", SessionSource{CheckoutIntentID: "ci-1"}, PurposeOrderPayment, false},
		{"special request", SessionSource{SpecialRequestID: "sr-1"}, PurposeSpecialRequestPayment, false},
		{"subscription purchase", SessionSource{SubscriptionPurchaseID: "sp-1"}, PurposeSubscriptionPurchase, false},
		{"none present", SessionSource{}, "", true},
		{
			"two present is ambiguous, not a default",
			SessionSource{CheckoutIntentID: "ci-1", SpecialRequestID: "sr-1"},
			"", true,
		},
		{
			"all three present is still ambiguous",
			SessionSource{CheckoutIntentID: "ci-1", SpecialRequestID: "sr-1", SubscriptionPurchaseID: "sp-1"},
			"", true,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := DerivePaymentSessionPurpose(tc.source)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got purpose %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestValidatePaymentAllocation_EmptyIsValid(t *testing.T) {
	// A session with no breakdown is not broken; it means "not itemised", and
	// existing callers that never send a breakdown must keep working.
	if err := ValidatePaymentAllocation(nil, 5000); err != nil {
		t.Fatalf("empty allocation must be valid, got: %v", err)
	}
}

func TestValidatePaymentAllocation_Conserves(t *testing.T) {
	lines := []AllocationLine{
		{Component: AllocationGoodsSubtotal, AmountMinorUnits: 4000},
		{Component: AllocationDeliveryFee, AmountMinorUnits: 1000},
	}
	if err := ValidatePaymentAllocation(lines, 5000); err != nil {
		t.Fatalf("conserving allocation must be valid, got: %v", err)
	}
}

func TestValidatePaymentAllocation_RejectsNonConserving(t *testing.T) {
	lines := []AllocationLine{
		{Component: AllocationGoodsSubtotal, AmountMinorUnits: 4000},
		{Component: AllocationDeliveryFee, AmountMinorUnits: 999},
	}
	err := ValidatePaymentAllocation(lines, 5000)
	if err == nil {
		t.Fatal("expected conservation error, got nil")
	}
}

func TestValidatePaymentAllocation_RejectsRepeatedComponent(t *testing.T) {
	// This is the exact failure mode the spec worries about: the delivery fee
	// being represented twice. It must be rejected outright, not summed.
	lines := []AllocationLine{
		{Component: AllocationDeliveryFee, AmountMinorUnits: 500},
		{Component: AllocationDeliveryFee, AmountMinorUnits: 500},
	}
	err := ValidatePaymentAllocation(lines, 1000)
	if err == nil {
		t.Fatal("expected a repeated-component error, got nil")
	}
}

func TestValidatePaymentAllocation_RejectsUnknownComponent(t *testing.T) {
	lines := []AllocationLine{
		{Component: AllocationComponent("bonus_credit"), AmountMinorUnits: 1000},
	}
	err := ValidatePaymentAllocation(lines, 1000)
	if err == nil {
		t.Fatal("expected an unknown-component error, got nil")
	}
}

func TestValidatePaymentAllocation_DiscountMustNotBePositive(t *testing.T) {
	lines := []AllocationLine{
		{Component: AllocationGoodsSubtotal, AmountMinorUnits: 1000},
		{Component: AllocationDiscount, AmountMinorUnits: 100},
	}
	err := ValidatePaymentAllocation(lines, 1100)
	if err == nil {
		t.Fatal("expected a sign error for a positive discount, got nil")
	}
}

func TestValidatePaymentAllocation_NonDiscountMustNotBeNegative(t *testing.T) {
	lines := []AllocationLine{
		{Component: AllocationDeliveryFee, AmountMinorUnits: -500},
	}
	err := ValidatePaymentAllocation(lines, -500)
	if err == nil {
		t.Fatal("expected a sign error for a negative delivery fee, got nil")
	}
}

func TestValidatePaymentAllocation_DiscountConservesNetTotal(t *testing.T) {
	lines := []AllocationLine{
		{Component: AllocationGoodsSubtotal, AmountMinorUnits: 5000},
		{Component: AllocationDeliveryFee, AmountMinorUnits: 1000},
		{Component: AllocationDiscount, AmountMinorUnits: -500},
	}
	if err := ValidatePaymentAllocation(lines, 5500); err != nil {
		t.Fatalf("discount-adjusted allocation must be valid, got: %v", err)
	}
}
