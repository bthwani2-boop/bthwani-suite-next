package commercial

import (
	"testing"
	"time"
)

func TestNormalizeStoreOnboardingFeePolicyInput(t *testing.T) {
	effectiveFrom := time.Date(2026, time.August, 21, 15, 30, 0, 0, time.FixedZone("Yemen", 3*60*60))
	valid := StoreOnboardingFeePolicyInput{
		Enabled:          true,
		AmountMinorUnits: 2500,
		Currency:         " yer ",
		AppliesTo:        " first_store ",
		ChargeTiming:     " on_approval ",
		EffectiveFrom:    &effectiveFrom,
		Notes:            "  initial policy  ",
		ExpectedVersion:  0,
		Reason:           "  launch policy  ",
		CreatedByActorID: "  actor-1  ",
	}

	normalized, err := normalizeStoreOnboardingFeePolicyInput(valid)
	if err != nil {
		t.Fatalf("valid policy rejected: %v", err)
	}
	if normalized.Currency != "YER" || normalized.AppliesTo != "first_store" || normalized.ChargeTiming != "on_approval" || normalized.Notes != "initial policy" || normalized.Reason != "launch policy" || normalized.CreatedByActorID != "actor-1" {
		t.Fatalf("input was not canonicalized: %#v", normalized)
	}
	if normalized.EffectiveFrom == nil || !normalized.EffectiveFrom.Equal(effectiveFrom.UTC()) || normalized.EffectiveFrom.Location() != time.UTC {
		t.Fatalf("effectiveFrom was not normalized to UTC: %#v", normalized.EffectiveFrom)
	}

	cases := []struct {
		name   string
		mutate func(*StoreOnboardingFeePolicyInput)
	}{
		{name: "unsupported currency", mutate: func(input *StoreOnboardingFeePolicyInput) { input.Currency = "US1" }},
		{name: "unsupported scope", mutate: func(input *StoreOnboardingFeePolicyInput) { input.AppliesTo = "unknown" }},
		{name: "unsupported timing", mutate: func(input *StoreOnboardingFeePolicyInput) { input.ChargeTiming = "later" }},
		{name: "enabled zero amount", mutate: func(input *StoreOnboardingFeePolicyInput) { input.AmountMinorUnits = 0 }},
		{name: "negative amount", mutate: func(input *StoreOnboardingFeePolicyInput) { input.AmountMinorUnits = -1 }},
		{name: "negative version", mutate: func(input *StoreOnboardingFeePolicyInput) { input.ExpectedVersion = -1 }},
		{name: "short reason", mutate: func(input *StoreOnboardingFeePolicyInput) { input.Reason = "no" }},
		{name: "missing actor", mutate: func(input *StoreOnboardingFeePolicyInput) { input.CreatedByActorID = "" }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			input := valid
			tc.mutate(&input)
			if _, err := normalizeStoreOnboardingFeePolicyInput(input); err != ErrInvalidFeePolicy {
				t.Fatalf("normalizeStoreOnboardingFeePolicyInput() error=%v, want %v", err, ErrInvalidFeePolicy)
			}
		})
	}
}

func TestOnboardingFeeRequestHashIsStableAndInputBound(t *testing.T) {
	input := StoreOnboardingFeePolicyInput{
		Enabled:          true,
		AmountMinorUnits: 2500,
		Currency:         "YER",
		AppliesTo:        "first_store",
		ChargeTiming:     "on_approval",
		ExpectedVersion:  0,
		Reason:           "launch policy",
		CreatedByActorID: "actor-1",
	}
	one, err := onboardingFeeRequestHash(input)
	if err != nil {
		t.Fatalf("hash input: %v", err)
	}
	two, err := onboardingFeeRequestHash(input)
	if err != nil {
		t.Fatalf("hash input again: %v", err)
	}
	if one != two || len(one) != 64 {
		t.Fatalf("hash is not stable hex: %q %q", one, two)
	}
	input.AmountMinorUnits++
	three, err := onboardingFeeRequestHash(input)
	if err != nil {
		t.Fatalf("hash changed input: %v", err)
	}
	if one == three {
		t.Fatal("request hash did not change when policy input changed")
	}
}

func TestProductTransitionPolicy(t *testing.T) {
	tests := []struct {
		from string
		to   string
		want bool
	}{
		{from: "draft", to: "active", want: true},
		{from: "draft", to: "paused", want: false},
		{from: "active", to: "paused", want: true},
		{from: "paused", to: "active", want: true},
		{from: "active", to: "draft", want: false},
		{from: "archived", to: "active", want: false},
	}
	for _, tt := range tests {
		t.Run(tt.from+"_to_"+tt.to, func(t *testing.T) {
			if got := productTransitionAllowed(tt.from, tt.to); got != tt.want {
				t.Fatalf("productTransitionAllowed(%q,%q)=%v want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestCycleEnd(t *testing.T) {
	start := time.Date(2026, time.January, 15, 10, 0, 0, 0, time.UTC)
	tests := []struct {
		cycle string
		want  time.Time
	}{
		{cycle: "monthly", want: time.Date(2026, time.February, 15, 10, 0, 0, 0, time.UTC)},
		{cycle: "quarterly", want: time.Date(2026, time.April, 15, 10, 0, 0, 0, time.UTC)},
		{cycle: "annual", want: time.Date(2027, time.January, 15, 10, 0, 0, 0, time.UTC)},
	}
	for _, tt := range tests {
		t.Run(tt.cycle, func(t *testing.T) {
			if got := cycleEnd(start, tt.cycle); !got.Equal(tt.want) {
				t.Fatalf("cycleEnd(%s)=%s want %s", tt.cycle, got, tt.want)
			}
		})
	}
}

func TestValidateProductInput(t *testing.T) {
	valid := CreateProductInput{
		Reference:        "sub-basic",
		DisplayName:      "الخطة الأساسية",
		PriceMinorUnits:  1000,
		Currency:         "YER",
		BillingCycle:     "monthly",
		CreatedByActorID: "operator-1",
	}
	if err := validateProductInput(valid); err != nil {
		t.Fatalf("valid product rejected: %v", err)
	}

	invalid := valid
	invalid.PriceMinorUnits = 0
	if err := validateProductInput(invalid); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for zero price, got %v", err)
	}

	invalid = valid
	invalid.BillingCycle = "weekly"
	if err := validateProductInput(invalid); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for unsupported cycle, got %v", err)
	}
}
