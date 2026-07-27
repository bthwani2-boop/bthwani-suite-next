package workforce

import "testing"

func TestLeadershipClassBundleMatrix(t *testing.T) {
	tests := []struct {
		class  string
		bundle string
		want   bool
	}{
		{"project_manager", PermissionBundlePlatformOwner, true},
		{"project_manager", PermissionBundleOperationsManager, false},
		{"coordinator", PermissionBundlePlatformCoordinator, true},
		{"department_manager", PermissionBundleOperationsManager, true},
		{"department_manager", PermissionBundlePlatformOwner, false},
		{"staff", PermissionBundleHRManager, false},
	}
	for _, test := range tests {
		if got := validateLeadershipClassBundle(test.class, test.bundle); got != test.want {
			t.Fatalf("validateLeadershipClassBundle(%q,%q)=%v want %v", test.class, test.bundle, got, test.want)
		}
	}
}

func TestAuthorityScopesStayDepartmentBound(t *testing.T) {
	scopes := authorityScopesForBundle(PermissionBundleOperationsManager, "operations")
	for _, scope := range scopes {
		if scope == "employee:create:all" || scope == "leadership:create" {
			t.Fatalf("department manager received elevated scope %q", scope)
		}
	}
	want := "employee:create:department:operations"
	found := false
	for _, scope := range scopes {
		if scope == want {
			found = true
		}
	}
	if !found {
		t.Fatalf("missing %q in %v", want, scopes)
	}
}

func TestNormalizeSovereignDepartment(t *testing.T) {
	got, err := normalizeSovereignDepartment("Operations Team")
	if err != nil {
		t.Fatalf("normalizeSovereignDepartment: %v", err)
	}
	if got != "operations-team" {
		t.Fatalf("got %q want operations-team", got)
	}
	if _, err := normalizeSovereignDepartment("../ops"); err == nil {
		t.Fatal("expected traversal-like department to be rejected")
	}
}
