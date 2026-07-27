package identity

import (
	"os"
	"strings"
	"testing"
)

func TestEmployeeActivationSurfaceRegistered(t *testing.T) {
	surface, ok := activationSurfaceFor("employee")
	if !ok || surface != "webapp" {
		t.Fatalf("employee activation surface = %q, %v; want webapp,true", surface, ok)
	}
}

func TestEmployeeActivationMigrationRegistersPersistedContract(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/identity-008_employee_activation_surface.sql")
	if err != nil {
		t.Fatalf("read employee activation migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{"'employee'", "'webapp'"} {
		if !strings.Contains(text, required) {
			t.Fatalf("employee activation migration is missing %s", required)
		}
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

func TestEmployeeAccessRejectsProviderAndConsumerRoles(t *testing.T) {
	tests := []struct {
		name  string
		roles []string
		want  bool
	}{
		{name: "client", roles: []string{"client"}, want: true},
		{name: "partner", roles: []string{"partner"}, want: true},
		{name: "field", roles: []string{"field"}, want: true},
		{name: "captain", roles: []string{"captain"}, want: true},
		{name: "mixed provider and employee", roles: []string{"field", "employee", "operator"}, want: true},
		{name: "existing employee", roles: []string{"employee", "operator"}, want: false},
		{name: "bootstrap operator", roles: []string{"operator"}, want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := employeeAccessConflictsWithRoles(test.roles); got != test.want {
				t.Fatalf("employeeAccessConflictsWithRoles(%v)=%v want %v", test.roles, got, test.want)
			}
		})
	}
}

func TestInvalidDepartmentRejected(t *testing.T) {
	if _, err := employeeBundlePermissions(EmployeeBundleStaff, "../platform"); err == nil {
		t.Fatal("expected invalid department to be rejected")
	}
}
