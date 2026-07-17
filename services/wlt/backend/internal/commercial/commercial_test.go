package commercial

import (
	"testing"
	"time"
)

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
		Reference: "sub-basic",
		DisplayName: "الخطة الأساسية",
		PriceMinorUnits: 1000,
		Currency: "YER",
		BillingCycle: "monthly",
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
