package workforce

import (
	"slices"
	"testing"
	"time"
)

func readyCommonCore(kind string) ProviderOperationalCore {
	return ProviderOperationalCore{
		WorkforceKind:              kind,
		GuarantorFullName:          "ضامن تجريبي",
		GuarantorRelationship:      "قريب",
		GuarantorPhoneE164:         "+967700000001",
		NationalIDNumber:           "NAT-001",
		IdentityFrontMediaRef:      "media://identity/front",
		IdentityVerificationStatus: "approved",
		ContractMediaRef:           "media://contract/provider",
		ContractReviewStatus:       "approved",
		OnboardingStage:            "activation_ready",
	}
}

func TestFieldActivationReadinessHasNoShiftRequirement(t *testing.T) {
	person := Person{
		WorkforceKind: "field",
		FullNameAr:    "ميداني تجريبي",
		WorkforceCode: "FLD-000001",
		FieldProfile: &FieldProfile{
			CityCode:          "SAH",
			ServiceZoneID:     "zone-1",
			ShiftCode:         "",
			SupervisorActorID: "supervisor-1",
		},
	}
	core := readyCommonCore("field")

	readiness := EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("expected field provider to be ready without a shift, missing=%v", readiness.Missing)
	}
	if slices.Contains(readiness.Missing, "shiftCode") {
		t.Fatal("shiftCode must never be an independent provider activation requirement")
	}
}

func TestFieldActivationReadinessDoesNotRequireProgressiveGuarantorReferralOrOnboarding(t *testing.T) {
	person := Person{
		WorkforceKind: "field",
		FullNameAr:    "ميداني مستقل",
		WorkforceCode: "FLD-000002",
		FieldProfile:  &FieldProfile{CityCode: "SAH", ServiceZoneID: "zone-1", SupervisorActorID: "supervisor-1"},
	}
	core := ProviderOperationalCore{
		WorkforceKind:              "field",
		NationalIDNumber:           "NAT-002",
		IdentityFrontMediaRef:      "media://identity/front-2",
		IdentityVerificationStatus: "approved",
		ContractMediaRef:           "media://contract/provider-2",
		ContractReviewStatus:       "approved",
	}

	readiness := EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("field readiness must use the bounded activation contract, missing=%v", readiness.Missing)
	}
}

func TestFieldActivationReadinessRequiresSupervisorIdentityAndContract(t *testing.T) {
	person := Person{
		WorkforceKind: "field",
		FullNameAr:    "ميداني ناقص",
		WorkforceCode: "FLD-000003",
		FieldProfile:  &FieldProfile{CityCode: "SAH", ServiceZoneID: "zone-1"},
	}
	readiness := EvaluateProviderActivationReadiness(person, ProviderOperationalCore{WorkforceKind: "field"})
	for _, blocker := range []string{"supervisorActorId", "nationalIdNumber", "identityFrontMediaRef", "identityApproved", "contractMediaRef", "contractApproved"} {
		if !slices.Contains(readiness.Missing, blocker) {
			t.Fatalf("expected blocker %q, missing=%v", blocker, readiness.Missing)
		}
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
		Classification:                "joker",
		FinancialGuaranteeMinorUnits:  0,
		FinancialGuaranteeStatus:      "not_funded",
		DeliveryBagCustodyStatus:      "issued",
		MandatoryPurchasesStatus:      "paid_and_delivered",
		TrainingStatus:                "passed",
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
		FullNameAr:    "كابتن جوكر",
		WorkforceCode: "CAP-000002",
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
