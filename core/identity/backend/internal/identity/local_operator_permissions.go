package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/lib/pq"
)

// localOperatorDevelopmentPermissions is the single local-development authority
// for the control-panel operator. Every entry must map to an action consumed by
// a live service boundary; aliases and migration-era permission names do not
// belong here.
func localOperatorDevelopmentPermissions() []Permission {
	return []Permission{
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
		// Special-request operations are a bounded Operations capability. Keep
		// the local operator projection aligned with the Operations Manager
		// bundle so the local Control Panel can exercise the canonical
		// SHEIN/Awnak surface through the same backend permission boundary.
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

		// Central-catalog runtime journeys use the same fine-grained actions as
		// production employees. Keep this list explicit: the local operator must
		// exercise RBAC, not a role-name bypass or a wildcard grant.
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

// localOperatorRolePermissions is the exact durable definition seeded by
// identity-027. The operator role is intentionally small: local bootstrap's
// broad development access is direct actor authority, while the role keeps
// only the shared support boundary used by deployed control-panel operators.
func localOperatorRolePermissions() []Permission {
	return []Permission{
		{Service: "dsh", Surface: "control-panel", Action: "support.read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "support.manage", Scope: "all"},
	}
}
func permissionSetKey(permission Permission) string {
	return permission.Service + "\x00" + permission.Surface + "\x00" + permission.Action + "\x00" + permission.Scope
}

func permissionSetsEqual(actual, expected []Permission) bool {
	if len(actual) != len(expected) {
		return false
	}
	remaining := make(map[string]int, len(expected))
	for _, permission := range expected {
		remaining[permissionSetKey(permission)]++
	}
	for _, permission := range actual {
		key := permissionSetKey(permission)
		if remaining[key] == 0 {
			return false
		}
		remaining[key]--
	}
	for _, count := range remaining {
		if count != 0 {
			return false
		}
	}
	return true
}

func (r *Repository) localOperatorDevelopmentPermissionsConverged(ctx context.Context, operatorContextID string) (bool, error) {
	var permissionsJSON []byte
	err := r.db.QueryRowContext(ctx, `
SELECT permissions
FROM identity_actors
WHERE id = 'operator-local-001'
  AND username = 'operator'
  AND operator_context_id = $1
  AND status = 'ACTIVE'`, operatorContextID).Scan(&permissionsJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	var actorPermissions []Permission
	if err := json.Unmarshal(permissionsJSON, &actorPermissions); err != nil {
		return false, err
	}

	expected := localOperatorDevelopmentPermissions()
	return permissionSetsEqual(actorPermissions, expected), nil
}

func (r *Repository) localOperatorRoleDefinitionConverged(ctx context.Context) (bool, error) {
	role, err := r.Enforcer.GetRoleDefinition(ctx, "operator")
	if errors.Is(err, ErrRoleNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return role.Active && permissionSetsEqual(role.Permissions, localOperatorRolePermissions()), nil
}

// reconcileLocalOperatorRoleDefinition repairs role-definition drift through
// Identity's canonical, idempotent role writer. Bootstrap never creates role
// or permission vocabulary and never writes identity_role_permissions directly.
func (r *Repository) reconcileLocalOperatorRoleDefinition(ctx context.Context) error {
	role, err := r.Enforcer.GetRoleDefinition(ctx, "operator")
	if errors.Is(err, ErrRoleNotFound) {
		return fmt.Errorf("canonical operator role is absent from Identity vocabulary")
	}
	if err != nil {
		return err
	}

	expected := localOperatorRolePermissions()
	if role.Active && permissionSetsEqual(role.Permissions, expected) {
		return nil
	}

	requestHash := roleDefinitionRequestHash(
		role.Name,
		role.Description,
		true,
		role.Version,
		expected,
	)
	_, err = r.Enforcer.UpsertRoleDefinitionWithOptions(
		ctx,
		role.Name,
		role.Description,
		true,
		role.Version,
		expected,
		"local-bootstrap:operator-role:"+requestHash,
		"identity-local-bootstrap",
	)
	return err
}

// reconcileLocalOperatorDevelopmentPermissions makes the actor projection and
// the role-permission graph exactly match the single local authority. It is
// deliberately local-bootstrap-only and removes stale grants as well as adding
// missing grants, so an old development database cannot remain over- or
// under-privileged after convergence.
func (r *Repository) reconcileLocalOperatorDevelopmentPermissions(ctx context.Context, operatorContextID string) error {
	if err := r.reconcileLocalOperatorRoleDefinition(ctx); err != nil {
		return err
	}

	expected := localOperatorDevelopmentPermissions()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var actorExists bool
	if err := tx.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1
  FROM identity_actors
  WHERE id = 'operator-local-001'
    AND username = 'operator'
    AND operator_context_id = $1
    AND status = 'ACTIVE'
)`, operatorContextID).Scan(&actorExists); err != nil {
		return err
	}
	if !actorExists {
		return fmt.Errorf(
			"canonical local operator is absent from operator context %q",
			operatorContextID,
		)
	}

	var existingRoles pq.StringArray
	if err := tx.QueryRowContext(
		ctx,
		`SELECT roles FROM identity_actors WHERE id = 'operator-local-001' AND operator_context_id = $1`,
		operatorContextID,
	).Scan(&existingRoles); err != nil {
		return err
	}

	// Actor access is the only runtime mutation here. Vocabulary and role
	// definitions are migration-owned and therefore read-only to bootstrap.
	if err := setActorAccessTx(
		ctx,
		tx,
		"operator-local-001",
		[]string(existingRoles),
		expected,
		"local-bootstrap",
	); err != nil {
		return err
	}

	return tx.Commit()
}
