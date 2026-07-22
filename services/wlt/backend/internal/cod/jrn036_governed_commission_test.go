package cod

import (
	"errors"
	"testing"
)

func TestJRN036CalculateFixedCommission(t *testing.T) {
	policy := GovernedCommissionPolicy{
		CalculationType:         "fixed",
		FixedAmountMinorUnits:   2500,
		MinimumAmountMinorUnits: 1000,
		Currency:                "YER",
	}
	amount, err := calculateGovernedCommissionAmount(policy, 0)
	if err != nil {
		t.Fatalf("calculate fixed commission: %v", err)
	}
	if amount != 2500 {
		t.Fatalf("amount=%d want=2500", amount)
	}
}

func TestJRN036CalculateBasisPointsWithBounds(t *testing.T) {
	maximum := int64(8000)
	policy := GovernedCommissionPolicy{
		CalculationType:         "basis_points",
		BasisPoints:             750,
		MinimumAmountMinorUnits: 2000,
		MaximumAmountMinorUnits: &maximum,
	}
	amount, err := calculateGovernedCommissionAmount(policy, 100000)
	if err != nil {
		t.Fatalf("calculate basis points: %v", err)
	}
	if amount != 7500 {
		t.Fatalf("amount=%d want=7500", amount)
	}
	amount, err = calculateGovernedCommissionAmount(policy, 1000)
	if err != nil {
		t.Fatalf("calculate minimum: %v", err)
	}
	if amount != 2000 {
		t.Fatalf("minimum amount=%d want=2000", amount)
	}
	amount, err = calculateGovernedCommissionAmount(policy, 200000)
	if err != nil {
		t.Fatalf("calculate maximum: %v", err)
	}
	if amount != 8000 {
		t.Fatalf("maximum amount=%d want=8000", amount)
	}
}

func TestJRN036FieldVisitDerivesEvidenceButNeverAmount(t *testing.T) {
	input, err := normalizeGovernedCommissionInput(CreateGovernedCommissionInput{
		BeneficiaryActorID:   "field-1",
		BeneficiaryActorType: "field",
		SourceType:           "field_visit",
		SourceID:             "visit-1",
	})
	if err != nil {
		t.Fatalf("normalize field visit: %v", err)
	}
	if input.CommissionType != "field_visit_fee" {
		t.Fatalf("commission type=%q", input.CommissionType)
	}
	if input.SourceEvidenceID != "visit-1" || input.SourceEvidenceHash == "" || input.SourceEvidenceStatus != "completed" {
		t.Fatalf("derived evidence is incomplete: %#v", input)
	}
	if input.GrossBasisMinorUnits != 0 {
		t.Fatalf("field visit must not derive a caller amount")
	}
}

func TestJRN036NonFieldCommissionRequiresEvidence(t *testing.T) {
	_, err := normalizeGovernedCommissionInput(CreateGovernedCommissionInput{
		BeneficiaryActorID:   "captain-1",
		BeneficiaryActorType: "captain",
		SourceType:           "delivery",
		SourceID:             "order-1",
		CommissionType:       "delivery_fee",
		GrossBasisMinorUnits: 10000,
	})
	if !errors.Is(err, ErrCommissionEvidenceRequired) {
		t.Fatalf("err=%v want evidence required", err)
	}
}

func TestJRN036RejectsCancelledOrUnverifiedEvidence(t *testing.T) {
	for _, status := range []string{"cancelled", "refunded", "pending", ""} {
		_, err := normalizeGovernedCommissionInput(CreateGovernedCommissionInput{
			BeneficiaryActorID:   "captain-1",
			BeneficiaryActorType: "captain",
			SourceType:           "delivery",
			SourceID:             "order-1",
			CommissionType:       "delivery_fee",
			SourceEvidenceID:     "delivery-event-1",
			SourceEvidenceHash:   "hash",
			SourceEvidenceStatus: status,
			GrossBasisMinorUnits: 10000,
		})
		if !errors.Is(err, ErrCommissionEvidenceRequired) {
			t.Fatalf("status=%q err=%v want evidence required", status, err)
		}
	}
}
