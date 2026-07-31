package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"regexp"
	"strings"

	"github.com/lib/pq"
)

const (
	EmployeeBundleStaff               = "staff"
	EmployeeBundlePlatformOwner       = "platform_owner"
	EmployeeBundlePlatformCoordinator = "platform_coordinator"
	EmployeeBundleOperationsManager   = "operations_manager"
	EmployeeBundlePartnersManager     = "partners_manager"
	EmployeeBundleFinanceManager      = "finance_manager"
	EmployeeBundleSupportManager      = "support_manager"
	EmployeeBundleHRManager           = "hr_manager"
)

var departmentCodePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,63}$`)

// EmployeeProvisionInput is the service-to-service request used by Workforce
// when it creates an administrative employee. Identity remains the only owner
// of roles, permissions, sessions and the sovereign phone number.
type EmployeeProvisionInput struct {
	Username         string `json:"username"`
	PhoneE164        string `json:"phoneE164"`
	PermissionBundle string `json:"permissionBundle"`
	DepartmentScope  string `json:"departmentScope"`
	OperatorContextID         string `json:"operatorContextId,omitempty"`
}

func init() {
	// Employee access invitations are actor-bound, issued only by Workforce,
	// and consumed exclusively by the administrative control-panel BFF.
	activationSurfaceByActorType["employee"] = "control-panel"
}

func normalizeDepartmentCode(raw string) (string, error) {
	value := strings.ToLower(strings.TrimSpace(raw))
	value = strings.ReplaceAll(value, " ", "-")
	if !departmentCodePattern.MatchString(value) {
		return "", ErrInvalidActivation
	}
	return value, nil
}

// employeeDshPermissions maps administrative bundles to the exact DSH actions
// consumed by control-panel routes. These grants replace broad operator-role
// fallbacks for every non-owner employee.
func employeeDshPermissions(bundle string) []Permission {
	grant := func(actions ...string) []Permission {
		permissions := make([]Permission, 0, len(actions))
		for _, action := range actions {
			permissions = append(permissions, Permission{
				Service: "dsh", Surface: "control-panel", Action: action, Scope: "all",
			})
		}
		return permissions
	}

	switch strings.TrimSpace(bundle) {
	case EmployeeBundlePlatformOwner:
		return grant("platform.read", "platform.manage")
	case EmployeeBundlePlatformCoordinator:
		return grant("platform.read")
	case EmployeeBundleOperationsManager:
		return grant("operations.read", "operations.manage")
	case EmployeeBundlePartnersManager:
		return grant("partners.read", "partners.manage", "partners.activate")
	case EmployeeBundleFinanceManager:
		return grant("finance.read", "finance.manage")
	case EmployeeBundleSupportManager:
		return grant("support.read", "support.manage")
	default:
		return nil
	}
}

func employeeBundlePermissions(bundle, department string) ([]Permission, error) {
	bundle = strings.TrimSpace(bundle)
	if bundle == "" {
		bundle = EmployeeBundleStaff
	}
	department, err := normalizeDepartmentCode(department)
	if err != nil {
		return nil, err
	}
	departmentScope := "department:" + department
	permissions := []Permission{
		{Service: "workforce", Surface: "control-panel", Action: "employee:read", Scope: "own"},
		{Service: "workforce", Surface: "control-panel", Action: "employee:update", Scope: "own"},
	}

	managerDepartmentPermissions := func() {
		permissions = append(permissions,
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:read", Scope: departmentScope},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:create", Scope: departmentScope},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:update", Scope: departmentScope},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:suspend", Scope: departmentScope},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:reactivate", Scope: departmentScope},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee.activation:issue", Scope: departmentScope},
		)
	}

	switch bundle {
	case EmployeeBundleStaff:
		// A regular employee receives only self-scoped Workforce access. Service
		// modules grant additional permissions independently when required.
	case EmployeeBundlePlatformOwner:
		permissions = append(permissions,
			Permission{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
			Permission{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
			Permission{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "leadership:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "leadership:create", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "leadership:update", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:create", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:update", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:suspend", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:reactivate", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee.activation:issue", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "provider:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "provider:create", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "provider:update", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "provider:suspend", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "provider:reactivate", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "provider.activation:issue", Scope: "all"},
		)
	case EmployeeBundlePlatformCoordinator:
		permissions = append(permissions,
			Permission{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "leadership:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:read", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:create", Scope: "all"},
			Permission{Service: "workforce", Surface: "control-panel", Action: "employee:update", Scope: "all"},
		)
	case EmployeeBundleOperationsManager, EmployeeBundlePartnersManager,
		EmployeeBundleFinanceManager, EmployeeBundleSupportManager, EmployeeBundleHRManager:
		managerDepartmentPermissions()
		if bundle == EmployeeBundleOperationsManager {
			permissions = append(permissions,
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:read", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:create", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:update", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:suspend", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider:reactivate", Scope: "all"},
				Permission{Service: "workforce", Surface: "control-panel", Action: "provider.activation:issue", Scope: "all"},
			)
		}
	default:
		return nil, ErrInvalidActivation
	}
	permissions = append(permissions, employeeDshPermissions(bundle)...)
	return permissions, nil
}

// mergeEmployeeRoles derives coarse authentication roles from the canonical
// permission bundle. The broad DSH operator role is reserved for the sovereign
// platform owner; every other employee must pass exact permission checks.
func mergeEmployeeRoles(existing []string, bundle string) []string {
	result := append([]string{}, existing...)
	bundle = strings.TrimSpace(bundle)
	if bundle == "" {
		bundle = EmployeeBundleStaff
	}
	requiredRoles := []string{"employee"}
	if bundle == EmployeeBundlePlatformOwner {
		requiredRoles = append(requiredRoles, "operator")
	}
	for _, required := range requiredRoles {
		if !hasRole(result, required) {
			result = append(result, required)
		}
	}
	if bundle != EmployeeBundleStaff && !hasRole(result, "workforce.supervise.employee") {
		result = append(result, "workforce.supervise.employee")
	}
	return result
}

// employeeAccessConflictsWithRoles protects the control-panel trust boundary.
// A phone already used by a consumer, partner, field agent or captain cannot be
// silently upgraded into an administrative employee.
func employeeAccessConflictsWithRoles(roles []string) bool {
	for _, role := range roles {
		switch strings.TrimSpace(role) {
		case "client", "partner", "field", "captain":
			return true
		}
	}
	return false
}

func permissionIdentityKey(permission Permission) string {
	return strings.Join([]string{permission.Service, permission.Surface, permission.Action, permission.Scope}, "|")
}

func mergeEmployeePermissions(existing, requested []Permission) []Permission {
	result := append([]Permission{}, existing...)
	seen := make(map[string]struct{}, len(result)+len(requested))
	for _, permission := range result {
		seen[permissionIdentityKey(permission)] = struct{}{}
	}
	for _, permission := range requested {
		key := permissionIdentityKey(permission)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, permission)
	}
	return result
}

// ProvisionEmployee creates one new administrative actor with an explicit,
// server-owned permission bundle. Existing phones are rejected; changing an
// existing employee's bundle requires a separate audited Identity operation.
func (r *Repository) ProvisionEmployee(ctx context.Context, input EmployeeProvisionInput) (ActorAdminView, error) {
	username := strings.TrimSpace(input.Username)
	if username == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.PhoneE164)
	if err != nil {
		return ActorAdminView{}, err
	}
	permissionBundle := strings.TrimSpace(input.PermissionBundle)
	if permissionBundle == "" {
		permissionBundle = EmployeeBundleStaff
	}
	permissions, err := employeeBundlePermissions(permissionBundle, input.DepartmentScope)
	if err != nil {
		return ActorAdminView{}, err
	}
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	_, err = actorByPhoneAnyRoleTx(ctx, tx, phone)
	if err == nil {
		return ActorAdminView{}, ErrPhoneAlreadyBound
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return ActorAdminView{}, err
	}

	suffix, err := randomToken(9)
	if err != nil {
		return ActorAdminView{}, err
	}
	actorID := "employee-" + suffix
	roles := mergeEmployeeRoles(nil, permissionBundle)
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return ActorAdminView{}, err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, active, updated_at)
		VALUES ($1,$2,'',$3,$4,$5,$6::jsonb,false,now())`,
		actorID, username, operatorContextID, phone, pq.Array(roles), string(permissionsJSON))
	if err != nil {
		return ActorAdminView{}, mapUniqueViolation(err)
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{ActorID: actorID, Username: username, PhoneE164: phone, Roles: roles, Active: false}, nil
}

// BootstrapSovereignLeadershipAccess upgrades only the explicit local operator
// bootstrap actor so development can exercise the sovereign leadership journey.
func (r *Repository) BootstrapSovereignLeadershipAccess(ctx context.Context, input LocalBootstrap) error {
	if !input.Enabled {
		return nil
	}
	permissions, err := employeeBundlePermissions(EmployeeBundlePlatformOwner, "platform")
	if err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	actor, err := actorByIDTx(ctx, tx, "operator-local-001")
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	roles := mergeEmployeeRoles(actor.Roles, EmployeeBundlePlatformOwner)
	mergedPermissions := mergeEmployeePermissions(actor.Permissions, permissions)
	permissionsJSON, err := json.Marshal(mergedPermissions)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE identity_actors SET roles=$2,permissions=$3::jsonb,updated_at=now() WHERE id=$1`,
		actor.ID, pq.Array(roles), string(permissionsJSON)); err != nil {
		return err
	}
	return tx.Commit()
}
