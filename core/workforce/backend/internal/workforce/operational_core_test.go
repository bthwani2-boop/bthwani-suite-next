package workforce

import (
	"slices"
	"testing"
	"time"
)

func TestValidateOperationalCorePatchEnforcesCanonicalVocabulary(t *testing.T) {
	valid := OperationalCorePatch{
		ReferralSourceType:         stringPtr("employee"),
		IdentityVerificationStatus: stringPtr("approved"),
		ContractReviewStatus:       stringPtr("under_review"),
		OnboardingStage:            stringPtr("activation_ready"),
		Captain: &CaptainActivationCorePatch{
			Classification:                stringPtr("joker"),
			DeliveryBagCustodyStatus:      stringPtr("issued"),
			MandatoryPurchasesStatus:      stringPtr("paid_and_delivered"),
			TrainingStatus:                stringPtr("passed"),
			OperationsAccreditationStatus: stringPtr("approved"),
		},
	}
	if err := validateOperationalCorePatch("captain", valid); err != nil {
		t.Fatalf("valid operational patch rejected: %v", err)
	}
	if err := validateOperationalCorePatch("field", OperationalCorePatch{}); err != nil {
		t.Fatalf("empty progressive field patch rejected: %v", err)
	}

	cases := []struct {
		name  string
		kind  string
		patch OperationalCorePatch
	}{
		{name: "referral", kind: "field", patch: OperationalCorePatch{ReferralSourceType: stringPtr("unknown")}},
		{name: "identity", kind: "field", patch: OperationalCorePatch{IdentityVerificationStatus: stringPtr("verified")}},
		{name: "contract", kind: "field", patch: OperationalCorePatch{ContractReviewStatus: stringPtr("accepted")}},
		{name: "stage", kind: "field", patch: OperationalCorePatch{OnboardingStage: stringPtr("ready")}},
		{name: "captain block on field", kind: "field", patch: OperationalCorePatch{Captain: &CaptainActivationCorePatch{Classification: stringPtr("joker")}}},
		{name: "classification", kind: "captain", patch: OperationalCorePatch{Captain: &CaptainActivationCorePatch{Classification: stringPtr("senior")}}},
		{name: "bag custody", kind: "captain", patch: OperationalCorePatch{Captain: &CaptainActivationCorePatch{DeliveryBagCustodyStatus: stringPtr("active")}}},
		{name: "purchases", kind: "captain", patch: OperationalCorePatch{Captain: &CaptainActivationCorePatch{MandatoryPurchasesStatus: stringPtr("complete")}}},
		{name: "training", kind: "captain", patch: OperationalCorePatch{Captain: &CaptainActivationCorePatch{TrainingStatus: stringPtr("certified")}}},
		{name: "accreditation", kind: "captain", patch: OperationalCorePatch{Captain: &CaptainActivationCorePatch{OperationsAccreditationStatus: stringPtr("active")}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateOperationalCorePatch(tc.kind, tc.patch); err != ErrInvalidInput {
				t.Fatalf("validateOperationalCorePatch() error=%v, want %v", err, ErrInvalidInput)
			}
		})
	}
}

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

func stringPtr(value string) *string { return &value }

func TestFieldActivationReadinessHasNoShiftRequirement(t *testing.T) {
	person := Person{
		WorkforceKind: "field",
		FullNameAr:    "ميداني تجريبي",
		WorkforceCode: "FLD-000001",
		FieldProfile: &FieldProfile{
			ServiceAreaCode:   "SAH",
			ServiceZoneID:     "zone-1",
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
		FieldProfile:  &FieldProfile{ServiceAreaCode: "SAH", ServiceZoneID: "zone-1", SupervisorActorID: "supervisor-1"},
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
		FieldProfile:  &FieldProfile{ServiceAreaCode: "SAH", ServiceZoneID: "zone-1"},
	}
	readiness := EvaluateProviderActivationReadiness(person, ProviderOperationalCore{WorkforceKind: "field"})
	for _, blocker := range []string{"supervisorActorId", "nationalIdNumber", "identityFrontMediaRef", "identityApproved", "contractMediaRef", "contractApproved"} {
		if !slices.Contains(readiness.Missing, blocker) {
			t.Fatalf("expected blocker %q, missing=%v", blocker, readiness.Missing)
		}
	}
}

func TestCaptainOperationalReadinessExcludesCrossServiceFinancialEligibility(t *testing.T) {
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
		DeliveryBagCustodyStatus:      "issued",
		MandatoryPurchasesStatus:      "paid_and_delivered",
		TrainingStatus:                "passed",
		OperationsAccreditationStatus: "approved",
	}

	readiness := EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("captain operational readiness must not invent a WLT blocker, missing=%v", readiness.Missing)
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
		DeliveryBagCustodyStatus:      "issued",
		MandatoryPurchasesStatus:      "paid_and_delivered",
		TrainingStatus:                "passed",
		OperationsAccreditationStatus: "approved",
	}

	readiness := EvaluateProviderActivationReadiness(person, core)
	if !readiness.Ready {
		t.Fatalf("captain operational readiness must be ready before the separate DSH/WLT activation gate, missing=%v", readiness.Missing)
	}
}
