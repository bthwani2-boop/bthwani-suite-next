package workforce

import "testing"

func TestFieldActivationReadinessUsesServiceZoneAndSupervisor(t *testing.T) {
	person := Person{
		WorkforceKind: "field",
		FullNameAr:    "مندوب اختبار",
		WorkforceCode: "FLD-TEST-001",
		FieldProfile: &FieldProfile{
			ServiceAreaCode: "sana",
			ServiceZoneID:   "zone-local-001",
		},
	}

	core := ProviderOperationalCore{
		WorkforceKind:              "field",
		NationalIDNumber:           "NAT-003",
		IdentityFrontMediaRef:      "media://identity/front-3",
		IdentityVerificationStatus: "approved",
		ContractMediaRef:           "media://contract/provider-3",
		ContractReviewStatus:       "approved",
	}
	person.FieldProfile.SupervisorActorID = "supervisor-1"
	if readiness := EvaluateProviderActivationReadiness(person, core); !readiness.Ready {
		t.Fatalf("field activation readiness must use the governed service-zone and supervisor bindings, missing=%v", readiness.Missing)
	}

	person.FieldProfile.ServiceZoneID = ""
	if readiness := EvaluateProviderActivationReadiness(person, core); readiness.Ready {
		t.Fatal("field activation readiness must fail without the governed service-zone binding")
	}
}

func TestSovereignFieldsCompleteRejectsMissingRoleProjection(t *testing.T) {
	person := Person{
		FullNameAr:    "مزود اختبار",
		WorkforceCode: "WF-TEST-001",
	}

	if readiness := EvaluateProviderActivationReadiness(person, ProviderOperationalCore{WorkforceKind: "field"}); readiness.Ready {
		t.Fatal("activation readiness must fail when the workforce role projection is missing")
	}
}
