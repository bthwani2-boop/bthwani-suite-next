// Package localbootstrap owns development-only identity fixtures.
//
// This package is imported only by cmd/identity-local-bootstrap. The
// production identity-api command does not import it and has no startup,
// supervisor, password-default, or fixture-account path.
package localbootstrap

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"identity-api/internal/identity"
)

const (
	operatorActorID = "operator-local-001"
	operatorRole    = "operator"
)

// Config is intentionally consumed by the one-shot development executable,
// never by the production Identity API.
type Config struct {
	Password          string
	OperatorContextID string
}

func (c Config) validate() error {
	if len(c.Password) < 6 {
		return errors.New("BTHWANI_LOCAL_DEV_PASSWORD must contain at least 6 characters")
	}
	if strings.TrimSpace(c.OperatorContextID) == "" {
		return errors.New("BTHWANI_OPERATOR_CONTEXT_ID is required for the development identity seed")
	}
	return nil
}

type actorFixture struct {
	id          string
	username    string
	role        string
	phone       string
	permissions []identity.Permission
}

// Run performs one deterministic development seed pass. Role and permission
// vocabulary are migration-owned; this pass only binds actors to existing
// canonical vocabulary through Identity's writer.
func Run(ctx context.Context, db *sql.DB, config Config) error {
	if err := config.validate(); err != nil {
		return err
	}
	if db == nil {
		return errors.New("development identity seed requires a database")
	}

	if err := validateOperatorRoleDefinition(ctx, db); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(config.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	repository := identity.NewRepository(db)
	for _, actor := range actorFixtures() {
		roles := []string{actor.role}
		if actor.id == operatorActorID {
			roles = []string{
				"operator",
				"employee",
				"workforce.supervise.employee",
				"workforce.supervise.field",
				"workforce.supervise.captain",
			}
		}
		if err := repository.UpsertActorWithAccess(ctx, identity.ActorAccessProvisionInput{
			ID:                actor.id,
			Username:          actor.username,
			PasswordHash:      string(hash),
			OperatorContextID: config.OperatorContextID,
			PhoneE164:         actor.phone,
			Roles:             roles,
			Permissions:       actor.permissions,
			GrantedBy:         "identity-local-development-seed",
		}); err != nil {
			return fmt.Errorf("seed actor %s: %w", actor.id, err)
		}
	}

	_, err = db.ExecContext(ctx, `
DELETE FROM identity_login_attempts AS attempt
USING identity_actors AS actor
WHERE attempt.username = actor.username
  AND attempt.succeeded = false
  AND attempt.created_at <= actor.updated_at
  AND actor.id = ANY($1)`, pq.Array(fixtureActorIDs()))
	return err
}

// Converged is a normalized readback of the seed's actual actor/access state.
// It never treats the JSON projection as authority; it also checks that the
// projection agrees with the canonical RBAC readback.
func Converged(ctx context.Context, db *sql.DB, config Config) (bool, error) {
	if err := config.validate(); err != nil {
		return false, err
	}
	if db == nil {
		return false, errors.New("development identity seed convergence requires a database")
	}
	roleOK, err := roleConverged(ctx, db)
	if err != nil {
		return false, err
	}
	if !roleOK {
		return false, nil
	}

	fixtures := actorFixtures()
	rows, err := db.QueryContext(ctx, `
SELECT id, username, operator_context_id, COALESCE(phone_e164, ''), status
FROM identity_actors
WHERE id = ANY($1)`, pq.Array(fixtureActorIDs()))
	if err != nil {
		return false, err
	}
	defer rows.Close()
	seen := make(map[string]bool, len(fixtures))
	for rows.Next() {
		var id, username, operatorContextID, phone, status string
		if err := rows.Scan(&id, &username, &operatorContextID, &phone, &status); err != nil {
			return false, err
		}
		fixture, ok := fixtureByID(id)
		if !ok || seen[id] || username != fixture.username || operatorContextID != config.OperatorContextID || phone != fixture.phone || status != string(identity.ActorStatusActive) {
			return false, nil
		}
		seen[id] = true
		roles, permissions, err := actorAccess(ctx, db, id)
		if err != nil {
			return false, err
		}
		expectedRoles := []string{fixture.role}
		if id == operatorActorID {
			expectedRoles = []string{"employee", "operator", "workforce.supervise.captain", "workforce.supervise.employee", "workforce.supervise.field"}
		}
		if !stringSetEqual(roles, expectedRoles) || !permissionSetEqual(permissions, fixture.permissions) {
			return false, nil
		}
	}
	if err := rows.Err(); err != nil {
		return false, err
	}
	if len(seen) != len(fixtures) {
		return false, nil
	}

	repository := identity.NewRepository(db)
	for _, fixture := range fixtures {
		var projectedJSON []byte
		if err := db.QueryRowContext(ctx, `SELECT permissions FROM identity_actors WHERE id = $1`, fixture.id).Scan(&projectedJSON); err != nil {
			return false, err
		}
		var projected []identity.Permission
		if err := json.Unmarshal(projectedJSON, &projected); err != nil {
			return false, err
		}
		effective, err := repository.Enforcer.GetActorPermissions(ctx, fixture.id)
		if err != nil || !permissionSetEqual(projected, effective) {
			return false, err
		}
	}
	return true, nil
}

func validateOperatorRoleDefinition(ctx context.Context, db *sql.DB) error {
	role, err := identity.NewPermissionEnforcer(db).GetRoleDefinition(ctx, operatorRole)
	if errors.Is(err, identity.ErrRoleNotFound) {
		return errors.New("canonical operator role is absent from Identity vocabulary")
	}
	if err != nil {
		return err
	}
	if !role.Active || !permissionSetEqual(role.Permissions, operatorRolePermissions()) {
		return errors.New("canonical operator role definition drifted; local development seed cannot mutate migration-owned role authority")
	}
	return nil
}

func roleConverged(ctx context.Context, db *sql.DB) (bool, error) {
	role, err := identity.NewPermissionEnforcer(db).GetRoleDefinition(ctx, operatorRole)
	if errors.Is(err, identity.ErrRoleNotFound) {
		return false, errors.New("canonical operator role is absent from Identity vocabulary")
	}
	if err != nil {
		return false, err
	}
	if !role.Active || !permissionSetEqual(role.Permissions, operatorRolePermissions()) {
		return false, nil
	}
	return true, nil
}

func actorAccess(ctx context.Context, db *sql.DB, actorID string) ([]string, []identity.Permission, error) {
	roleRows, err := db.QueryContext(ctx, `
SELECT role.name
FROM identity_actor_roles assignment
JOIN identity_roles role ON role.id = assignment.role_id
WHERE assignment.actor_id = $1
ORDER BY role.name`, actorID)
	if err != nil {
		return nil, nil, err
	}
	var roles []string
	for roleRows.Next() {
		var role string
		if err := roleRows.Scan(&role); err != nil {
			roleRows.Close()
			return nil, nil, err
		}
		roles = append(roles, role)
	}
	if err := roleRows.Err(); err != nil {
		roleRows.Close()
		return nil, nil, err
	}
	roleRows.Close()

	permissionRows, err := db.QueryContext(ctx, `
SELECT vocabulary.service, vocabulary.surface, vocabulary.action, direct_permission.scope
FROM identity_actor_direct_permissions direct_permission
JOIN identity_permission_vocabulary vocabulary ON vocabulary.id = direct_permission.permission_id
WHERE direct_permission.actor_id = $1
ORDER BY vocabulary.service, vocabulary.surface, vocabulary.action, direct_permission.scope`, actorID)
	if err != nil {
		return nil, nil, err
	}
	var permissions []identity.Permission
	for permissionRows.Next() {
		var permission identity.Permission
		if err := permissionRows.Scan(&permission.Service, &permission.Surface, &permission.Action, &permission.Scope); err != nil {
			permissionRows.Close()
			return nil, nil, err
		}
		permissions = append(permissions, permission)
	}
	if err := permissionRows.Err(); err != nil {
		permissionRows.Close()
		return nil, nil, err
	}
	permissionRows.Close()
	return roles, permissions, nil
}

func fixtureByID(id string) (actorFixture, bool) {
	for _, fixture := range actorFixtures() {
		if fixture.id == id {
			return fixture, true
		}
	}
	return actorFixture{}, false
}

func fixtureActorIDs() []string {
	fixtures := actorFixtures()
	ids := make([]string, 0, len(fixtures))
	for _, fixture := range fixtures {
		ids = append(ids, fixture.id)
	}
	return ids
}

func actorFixtures() []actorFixture {
	return []actorFixture{
		{id: "operator-local-001", username: "operator", role: "operator", phone: "+967770000000", permissions: localOperatorDevelopmentPermissions()},
		{id: "partner-local-001", username: "bthwani", role: "partner", phone: "+967771111111", permissions: identity.PartnerBundlePermissions(identity.PartnerBundleOwner, "store-test-grocery")},
		{id: "client-local-001", username: "client", role: "client", phone: "+967772222222", permissions: []identity.Permission{}},
		{id: "platform-approver-local-001", username: "platform-approver", role: "platform-approver", phone: "+967770000101", permissions: []identity.Permission{
			{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:variables:approve", Scope: "all"},
		}},
		{id: "platform-applier-local-001", username: "platform-applier", role: "platform-applier", phone: "+967770000102", permissions: []identity.Permission{
			{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:variables:apply", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:variables:rollback", Scope: "all"},
		}},
		{id: "platform-rollout-manager-local-001", username: "platform-rollout-manager", role: "platform-rollout-manager", phone: "+967770000103", permissions: []identity.Permission{
			{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
			{Service: "dsh", Surface: "control-panel", Action: "platform:rollouts:manage", Scope: "all"},
		}},
	}
}

func operatorRolePermissions() []identity.Permission {
	return []identity.Permission{
		{Service: "dsh", Surface: "control-panel", Action: "support.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "support.manage", Scope: "all"},
	}
}

func localOperatorDevelopmentPermissions() []identity.Permission {
	return []identity.Permission{
		{Service: "dsh", Surface: "control-panel", Action: "store:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "store:write", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "partners.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "partners.activate", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "finance.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "finance.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_financial_eligibility.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_financial_eligibility.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "operations.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "operations.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "operations.special_requests.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "operations.special_requests.transition", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "operations.special_requests.dispatch", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "marketing.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "marketing.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "support.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "support.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.service_zones.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.categories.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.categories.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.products.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.products.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.stores.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.banners.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.banners.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.discounts.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.catalog.discounts.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.review", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.marketing_review", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.adopt", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.proposal.publish", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.media.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.assortment.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "catalog.assortment.manage", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:read", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:create", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:update", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:suspend", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider:reactivate", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "provider.activation:issue", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "reference:manage", Scope: "all"},
		{Service: "workforce", Surface: "control-panel", Action: "audit:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.fulfillment_sla.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.fulfillment_sla.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_capacity.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.dispatch_capacity.manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.operational_policy.audit.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.operational_policy.evaluate", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "dsh.operational_policy.rollback", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:variables:propose", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:read", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:update", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:test", Scope: "all"},
	}
}

func stringSetEqual(actual, expected []string) bool {
	if len(actual) != len(expected) {
		return false
	}
	seen := make(map[string]bool, len(actual))
	for _, value := range actual {
		if seen[value] {
			return false
		}
		seen[value] = true
	}
	for _, value := range expected {
		if !seen[value] {
			return false
		}
	}
	return true
}

func permissionKey(permission identity.Permission) string {
	return permission.Service + "\x00" + permission.Surface + "\x00" + permission.Action + "\x00" + permission.Scope
}

func permissionSetEqual(actual, expected []identity.Permission) bool {
	if len(actual) != len(expected) {
		return false
	}
	seen := make(map[string]bool, len(actual))
	for _, permission := range actual {
		key := permissionKey(permission)
		if seen[key] {
			return false
		}
		seen[key] = true
	}
	for _, permission := range expected {
		if !seen[permissionKey(permission)] {
			return false
		}
	}
	return true
}
