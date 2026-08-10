package workforce

import "testing"

func TestSovereignFieldsCompleteFieldUsesServiceZoneInsteadOfRetiredShift(t *testing.T) {
	person := Person{
		FullNameAr:    "مندوب اختبار",
		WorkforceCode: "FLD-TEST-001",
		FieldProfile: &FieldProfile{
			CityCode:      "sana",
			ServiceZoneID: "zone-local-001",
			ShiftCode:     "",
		},
	}

	if !sovereignFieldsComplete(person) {
		t.Fatal("field activation readiness must not depend on deprecated shift_code")
	}

	person.FieldProfile.ServiceZoneID = ""
	if sovereignFieldsComplete(person) {
		t.Fatal("field activation readiness must fail without the governed service-zone binding")
	}
}

func TestSovereignFieldsCompleteRejectsMissingRoleProjection(t *testing.T) {
	person := Person{
		FullNameAr:    "مزود اختبار",
		WorkforceCode: "WF-TEST-001",
	}

	if sovereignFieldsComplete(person) {
		t.Fatal("activation readiness must fail when the workforce role projection is missing")
	}
}
