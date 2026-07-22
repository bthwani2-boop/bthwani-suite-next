package fieldreadiness

import (
	"errors"
	"math"
	"testing"
	"time"
)

func validGovernedLocation(now time.Time) *LocationEvidence {
	return &LocationEvidence{
		Latitude:       15.3694,
		Longitude:      44.1910,
		AccuracyMeters: 5,
		CapturedAt:     now,
		Provider:       "gps",
	}
}

func TestValidateGovernedLocationAcceptsFreshDeviceEvidence(t *testing.T) {
	now := time.Date(2026, 7, 22, 8, 0, 0, 0, time.UTC)
	if err := ValidateGovernedLocation(validGovernedLocation(now), now); err != nil {
		t.Fatalf("expected valid location, got %v", err)
	}
}

func TestValidateGovernedLocationRejectsUntrustedValues(t *testing.T) {
	now := time.Date(2026, 7, 22, 8, 0, 0, 0, time.UTC)
	tests := []struct {
		name string
		edit func(*LocationEvidence)
		want error
	}{
		{name: "mocked", edit: func(loc *LocationEvidence) { loc.IsMocked = true }, want: ErrLocationMocked},
		{name: "zero accuracy", edit: func(loc *LocationEvidence) { loc.AccuracyMeters = 0 }, want: ErrLocationAccuracy},
		{name: "nan accuracy", edit: func(loc *LocationEvidence) { loc.AccuracyMeters = math.NaN() }, want: ErrLocationAccuracy},
		{name: "latitude out of range", edit: func(loc *LocationEvidence) { loc.Latitude = 91 }, want: ErrInvalid},
		{name: "longitude out of range", edit: func(loc *LocationEvidence) { loc.Longitude = -181 }, want: ErrInvalid},
		{name: "stale", edit: func(loc *LocationEvidence) { loc.CapturedAt = now.Add(-121 * time.Second) }, want: ErrLocationStale},
		{name: "future", edit: func(loc *LocationEvidence) { loc.CapturedAt = now.Add(31 * time.Second) }, want: ErrInvalid},
		{name: "missing provider", edit: func(loc *LocationEvidence) { loc.Provider = "" }, want: ErrInvalid},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			location := validGovernedLocation(now)
			test.edit(location)
			if err := ValidateGovernedLocation(location, now); !errors.Is(err, test.want) {
				t.Fatalf("expected %v, got %v", test.want, err)
			}
		})
	}
}

func TestEscalationTransitionsKeepEscalatedFurtherBlocking(t *testing.T) {
	if !allowedEscalationTransition(EscalationOpen, EscalationEscalatedFurther) {
		t.Fatal("expected open escalation to allow escalation to a higher level")
	}
	if allowedEscalationTransition(EscalationResolved, EscalationOpen) {
		t.Fatal("resolved escalation must not reopen through the readiness endpoint")
	}
	if !allowedEscalationTransition(EscalationEscalatedFurther, EscalationResolved) {
		t.Fatal("escalated escalation must remain resolvable")
	}
}

func TestGovernedInputEnumsRejectUnknownValues(t *testing.T) {
	if err := validateVisitType(VisitType("unknown")); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected invalid visit type, got %v", err)
	}
	if err := validateCheckInput(UpdateCheckInput{CheckType: "unknown", Status: CheckPassed}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected invalid check type, got %v", err)
	}
	if err := validateCheckInput(UpdateCheckInput{CheckType: "location_verified", Status: CheckStatus("unknown")}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected invalid check status, got %v", err)
	}
	if err := validateEscalationInput(CreateEscalationInput{
		StoreID: "store-1", RaisedBy: "field-1", Severity: EscalationSeverity("unknown"), Category: CategoryOther, Description: "issue",
	}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected invalid escalation severity, got %v", err)
	}
}
