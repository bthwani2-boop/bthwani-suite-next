package identity

import "testing"

func TestEmployeePermissionBundleRegistryIsUniqueAndExpandable(t *testing.T) {
	bundles := EmployeePermissionBundles()
	if len(bundles) == 0 {
		t.Fatal("employee permission bundle registry must not be empty")
	}
	seen := map[string]struct{}{}
	for _, bundle := range bundles {
		if bundle.Code == "" || bundle.NameAr == "" || bundle.NameEn == "" {
			t.Fatalf("incomplete permission bundle descriptor: %+v", bundle)
		}
		if len(bundle.AllowedEmploymentClasses) == 0 {
			t.Fatalf("bundle %q has no allowed employment classes", bundle.Code)
		}
		if _, exists := seen[bundle.Code]; exists {
			t.Fatalf("duplicate employee permission bundle %q", bundle.Code)
		}
		seen[bundle.Code] = struct{}{}

		department := bundle.DefaultDepartmentScope
		if department == "" {
			department = "operations"
		}
		if _, err := employeeBundlePermissions(bundle.Code, department); err != nil {
			t.Fatalf("registered bundle %q cannot expand permissions: %v", bundle.Code, err)
		}
	}
}

func TestEmployeePermissionBundlesReturnsDefensiveCopy(t *testing.T) {
	first := EmployeePermissionBundles()
	if len(first) == 0 {
		t.Fatal("registry must not be empty")
	}
	originalCode := first[0].Code
	originalClass := first[0].AllowedEmploymentClasses[0]
	first[0].Code = "mutated"
	first[0].AllowedEmploymentClasses[0] = "mutated"

	second := EmployeePermissionBundles()
	if second[0].Code != originalCode || second[0].AllowedEmploymentClasses[0] != originalClass {
		t.Fatal("caller mutation changed the canonical employee permission bundle registry")
	}
}
