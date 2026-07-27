package workforce

import (
	"slices"
	"testing"
	"time"
)

func readyCommonCore(kind string) ProviderOperationalCore {
	return ProviderOperationalCore{
		WorkforceKind:               kind,
		GuarantorFullName:           "ضامن تجريبي",
		GuarantorRelationship:       "قريب",
		GuarantorPhoneE164:          "+967700000001",
		NationalIDNumber:            "NAT-001",
		IdentityFrontMediaRef:       "media://identity/front",
		IdentityVerificationStatus: "approved",
		ContractMediaRef:            "media://contract/provider",
		ContractReviewStatus:        "approved",
		OnboardingStage:             "activation_ready",
	}
}

func TestFieldActivationReadinessHasNoShiftRequirement(t *testing.T) {
	person := Person{
		WorkforceKind: "field",
		FullNameAr:    "ميداني تجريبي",
		WorkforceCode: "FLD-000001",
		FieldProfile: &FieldProfile{
			CityCode:      "SAH",
			ServiceZoneID: "zone-1",
			ShiftCode:     "",
		},
	}
	core := readyCommonCore("field")
	core.PartnershipsApprovedAt = time.Now().UTC().Format(time.RFC3339)

	readiness := EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("expected field provider to be ready without a shift, missing=%v", readiness.Missing)
	}
	if slices.Contains(readiness.Missing, "shiftCode") {
		t.Fatal("shiftCode must never be an independent provider activation requirement")
	}
}

func TestCaptainActivationRequiresSingleFundedFinancialGuarantee(t *testing.T) {
	expires := time.Now().UTC().AddDate(1, 0, 0).Format("2006-01-02")
	person := Person{
		WorkforceKind: "captain",
		FullNameAr:    "كابتن تجريبي",
		WorkforceCode: "CAP-000001",
		CaptainProfile: &CaptainProfile{
			VehicleType:      "motorcycle",
			LicenseStatus:    "valid",
			LicenseExpiresAt: expires,
		},
	}
	core := readyCommonCore("captain")
	core.Captain = &CaptainActivationCore{
		Classification:               "joker",
		FinancialGuaranteeMinorUnits: 0,
		FinancialGuaranteeStatus:     "not_funded",
		DeliveryBagCustodyStatus:     "issued",
		MandatoryPurchasesStatus:     "paid_and_delivered",
		TrainingStatus:               "passed",
		OperationsAccreditationStatus: "approved",
	}

	readiness := EvaluateProviderActivationReadiness(person, core)
	if readiness.Ready {
		t.Fatal("captain must not activate without a funded financial guarantee")
	}
	if !slices.Contains(readiness.Missing, "financialGuaranteeFunded") {
		t.Fatalf("expected financial guarantee blocker, missing=%v", readiness.Missing)
	}

	core.Captain.FinancialGuaranteeMinorUnits = 100000
	core.Captain.FinancialGuaranteeStatus = "funded"
	readiness = EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("expected fully prepared joker captain to be ready, missing=%v", readiness.Missing)
	}
}

func TestCaptainStartsAsJokerAndHasNoShiftRequirement(t *testing.T) {
	expires := time.Now().UTC().AddDate(1, 0, 0).Format("2006-01-02")
	person := Person{
		WorkforceKind: "captain",
		CaptainProfile: &CaptainProfile{
			VehicleType:      "car",
			LicenseStatus:    "valid",
			LicenseExpiresAt: expires,
		},
	}
	core := readyCommonCore("captain")
	core.Captain = &CaptainActivationCore{
		Classification:                "joker",
		FinancialGuaranteeMinorUnits:  50000,
		FinancialGuaranteeStatus:      "funded",
		DeliveryBagCustodyStatus:      "issued",
		MandatoryPurchasesStatus:      "paid_and_delivered",
		TrainingStatus:                "passed",
		OperationsAccreditationStatus: "approved",
	}

	readiness := EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("joker is the valid initial captain classification, missing=%v", readiness.Missing)
	}
}
