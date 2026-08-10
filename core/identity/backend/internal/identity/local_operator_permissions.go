package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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
		{Service: "dsh", Surface: "control-panel", Action: "platform:variables:propose", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:flags:manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:services:manage", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:health:acknowledge", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:audit:export", Scope: "all"},
		{Service: "dsh", Surface: "control-panel", Action: "platform:wlt-policy:read", Scope: "all"},

		{Service: "providers", Surface: "control-panel", Action: "provider:read", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:update", Scope: "all"},
		{Service: "providers", Surface: "control-panel", Action: "provider:test", Scope: "all"},
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
	if !permissionSetsEqual(actorPermissions, expected) {
		return false, nil
	}

	rows, err := r.db.QueryContext(ctx, `
SELECT vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope
FROM identity_roles AS role
JOIN identity_role_permissions AS role_permission ON role_permission.role_id = role.id
JOIN identity_permission_vocabulary AS vocabulary ON vocabulary.id = role_permission.permission_id
WHERE role.name = 'operator'`)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	rolePermissions := make([]Permission, 0, len(expected))
	for rows.Next() {
		var permission Permission
		if err := rows.Scan(&permission.Service, &permission.Surface, &permission.Action, &permission.Scope); err != nil {
			return false, err
		}
		rolePermissions = append(rolePermissions, permission)
	}
	if err := rows.Err(); err != nil {
		return false, err
	}
	return permissionSetsEqual(rolePermissions, expected), nil
}

// reconcileLocalOperatorDevelopmentPermissions makes the actor projection and
// the role-permission graph exactly match the single local authority. It is
// deliberately local-bootstrap-only and removes stale grants as well as adding
// missing grants, so an old development database cannot remain over- or
// under-privileged after convergence.
func (r *Repository) reconcileLocalOperatorDevelopmentPermissions(ctx context.Context, operatorContextID string) error {
	expected := localOperatorDevelopmentPermissions()
	permissionsJSON, err := json.Marshal(expected)
	if err != nil {
		return err
	}

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
		return fmt.Errorf("canonical local operator is absent from operator context %q", operatorContextID)
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE identity_actors
SET permissions = $2::jsonb,
    version = version + 1,
    updated_at = now()
WHERE id = 'operator-local-001'
  AND operator_context_id = $1
  AND permissions IS DISTINCT FROM $2::jsonb`, operatorContextID, string(permissionsJSON)); err != nil {
		return err
	}

	var roleID string
	if err := tx.QueryRowContext(ctx, `SELECT id FROM identity_roles WHERE name = 'operator'`).Scan(&roleID); err != nil {
		return err
	}
	requiredPermissionIDs := make(map[string]struct{}, len(expected))
	for _, permission := range expected {
		var permissionID string
		if err := tx.QueryRowContext(ctx, `
INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES ($1, $2, $3, 'Local Bootstrap Permission')
ON CONFLICT (service, surface, action) DO UPDATE SET description = EXCLUDED.description
RETURNING id`, permission.Service, permission.Surface, permission.Action).Scan(&permissionID); err != nil {
			return err
		}
		requiredPermissionIDs[permissionID] = struct{}{}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO identity_role_permissions(role_id, permission_id, scope)
VALUES ($1, $2, $3)
ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope`, roleID, permissionID, permission.Scope); err != nil {
			return err
		}
	}

	rows, err := tx.QueryContext(ctx, `SELECT permission_id FROM identity_role_permissions WHERE role_id = $1`, roleID)
	if err != nil {
		return err
	}
	stalePermissionIDs := []string{}
	for rows.Next() {
		var permissionID string
		if err := rows.Scan(&permissionID); err != nil {
			rows.Close()
			return err
		}
		if _, required := requiredPermissionIDs[permissionID]; !required {
			stalePermissionIDs = append(stalePermissionIDs, permissionID)
		}
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	for _, permissionID := range stalePermissionIDs {
		if _, err := tx.ExecContext(ctx, `
DELETE FROM identity_role_permissions
WHERE role_id = $1 AND permission_id = $2`, roleID, permissionID); err != nil {
			return err
		}
	}

	return tx.Commit()
}
