package identity

import "testing"

func TestEmployeeActivationSurfaceRegistered(t *testing.T) {
	surface, ok := activationSurfaceFor("employee")
	if !ok || surface != "webapp" {
		t.Fatalf("employee activation surface = %q, %v; want webapp,true", surface, ok)
	}
}

func TestPlatformOwnerBundleCarriesLeadershipAuthority(t *testing.T) {
	permissions, err := employeeBundlePermissions(EmployeeBundlePlatformOwner, "platform")
	if err != nil {
		t.Fatalf("employeeBundlePermissions: %v", err)
	}
	want := map[string]bool{
		"leadership:read|all":   false,
		"leadership:create|all": false,
		"employee:create|all":   false,
	}
	for _, permission := range permissions {
		key := permission.Action + "|" + permission.Scope
		if _, ok := want[key]; ok {
			want[key] = true
		}
	}
	for key, found := range want {
		if !found {
			t.Fatalf("missing platform owner permission %s", key)
		}
	}
}

func TestDepartmentManagerBundleIsDepartmentScoped(t *testing.T) {
	permissions, err := employeeBundlePermissions(EmployeeBundleOperationsManager, "operations")
	if err != nil {
		t.Fatalf("employeeBundlePermissions: %v", err)
	}
	foundScopedCreate := false
	for _, permission := range permissions {
		if permission.Action == "employee:create" && permission.Scope == "department:operations" {
			foundScopedCreate = true
		}
		if permission.Action == "leadership:create" {
			t.Fatalf("department manager must not receive leadership:create")
		}
	}
	if !foundScopedCreate {
		t.Fatal("operations manager is missing department-scoped employee:create")
	}
}

func TestInvalidDepartmentRejected(t *testing.T) {
	if _, err := employeeBundlePermissions(EmployeeBundleStaff, "../platform"); err == nil {
		t.Fatal("expected invalid department to be rejected")
	}
}
