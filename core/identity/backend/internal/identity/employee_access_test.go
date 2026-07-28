package identity

import (
	"os"
	"strings"
	"testing"
)

func TestEmployeeActivationSurfaceRegistered(t *testing.T) {
	surface, ok := activationSurfaceFor("employee")
	if !ok || surface != "control-panel" {
		t.Fatalf("employee activation surface = %q, %v; want control-panel,true", surface, ok)
	}
}

func TestEmployeeActivationMigrationRegistersPersistedContract(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/identity-008_employee_activation_surface.sql")
	if err != nil {
		t.Fatalf("read employee activation migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"'employee'",
		"SET surface = 'control-panel'",
		"surface = 'webapp'",
		"'control-panel'",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("employee activation migration is missing %s", required)
		}
	}
	constraintStart := strings.Index(text, "ADD CONSTRAINT identity_activation_challenges_surface_check")
	if constraintStart < 0 {
		t.Fatal("employee activation migration is missing the surface constraint")
	}
	constraintTail := text[constraintStart:]
	constraintEnd := strings.Index(constraintTail, ";")
	if constraintEnd < 0 {
		t.Fatal("employee activation surface constraint is not terminated")
	}
	if strings.Contains(constraintTail[:constraintEnd], "'webapp'") {
		t.Fatal("employee activation surface constraint must not register the independent webapp surface")
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

func TestEmployeeRolesReserveOperatorForPlatformOwner(t *testing.T) {
	tests := []struct {
		bundle          string
		wantOperator    bool
		wantSupervisory bool
	}{
		{bundle: EmployeeBundleStaff, wantOperator: false, wantSupervisory: false},
		{bundle: EmployeeBundlePlatformCoordinator, wantOperator: false, wantSupervisory: true},
		{bundle: EmployeeBundleOperationsManager, wantOperator: false, wantSupervisory: true},
		{bundle: EmployeeBundlePartnersManager, wantOperator: false, wantSupervisory: true},
		{bundle: EmployeeBundleFinanceManager, wantOperator: false, wantSupervisory: true},
		{bundle: EmployeeBundleSupportManager, wantOperator: false, wantSupervisory: true},
		{bundle: EmployeeBundleHRManager, wantOperator: false, wantSupervisory: true},
		{bundle: EmployeeBundlePlatformOwner, wantOperator: true, wantSupervisory: true},
	}
	for _, test := range tests {
		t.Run(test.bundle, func(t *testing.T) {
			roles := mergeEmployeeRoles(nil, test.bundle)
			if !hasRole(roles, "employee") {
				t.Fatalf("bundle %s is missing employee role: %v", test.bundle, roles)
			}
			if got := hasRole(roles, "operator"); got != test.wantOperator {
				t.Fatalf("bundle %s operator=%v want %v roles=%v", test.bundle, got, test.wantOperator, roles)
			}
			if got := hasRole(roles, "workforce.supervise.employee"); got != test.wantSupervisory {
				t.Fatalf("bundle %s supervisory=%v want %v roles=%v", test.bundle, got, test.wantSupervisory, roles)
			}
		})
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
