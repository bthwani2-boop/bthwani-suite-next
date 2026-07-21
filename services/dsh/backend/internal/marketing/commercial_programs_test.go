package marketing

import (
	"errors"
	"testing"
)

func TestValidateTier(t *testing.T) {
	t.Parallel()

	valid := []struct {
		name      string
		points    int64
		discount  float64
		threshold int64
	}{
		{name: "برونزي", points: 0, discount: 0, threshold: 0},
		{name: "ذهبي", points: 1000, discount: 12.5, threshold: 10000},
	}
	for _, tc := range valid {
		if err := validateTier(tc.name, tc.points, tc.discount, tc.threshold); err != nil {
			t.Fatalf("expected valid tier %+v, got %v", tc, err)
		}
	}

	invalid := []struct {
		name      string
		points    int64
		discount  float64
		threshold int64
	}{
		{name: "", points: 0, discount: 0, threshold: 0},
		{name: "x", points: -1, discount: 0, threshold: 0},
		{name: "x", points: 0, discount: -1, threshold: 0},
		{name: "x", points: 0, discount: 101, threshold: 0},
		{name: "x", points: 0, discount: 0, threshold: -1},
	}
	for _, tc := range invalid {
		if err := validateTier(tc.name, tc.points, tc.discount, tc.threshold); !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for %+v, got %v", tc, err)
		}
	}
}

func TestValidatePlan(t *testing.T) {
	t.Parallel()

	for _, cycle := range []string{"monthly", "quarterly", "annual"} {
		if err := validatePlan("خطة", 1000, cycle, 1, 0); err != nil {
			t.Fatalf("expected %s plan to be valid: %v", cycle, err)
		}
	}

	invalid := []struct {
		name       string
		price      int64
		cycle      string
		multiplier float64
		cap        int
	}{
		{name: "", price: 1, cycle: "monthly", multiplier: 1, cap: 0},
		{name: "x", price: 0, cycle: "monthly", multiplier: 1, cap: 0},
		{name: "x", price: 1, cycle: "weekly", multiplier: 1, cap: 0},
		{name: "x", price: 1, cycle: "monthly", multiplier: 0.99, cap: 0},
		{name: "x", price: 1, cycle: "monthly", multiplier: 1, cap: -1},
	}
	for _, tc := range invalid {
		if err := validatePlan(tc.name, tc.price, tc.cycle, tc.multiplier, tc.cap); !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for %+v, got %v", tc, err)
		}
	}
}
