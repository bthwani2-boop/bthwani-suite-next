package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// setActorAccessTx is the sole application writer for actor role assignments
// and direct permission grants. Callers must create/validate role and
// vocabulary definitions explicitly before invoking it; this helper never
// invents authority as a side effect.
func setActorAccessTx(ctx context.Context, tx *sql.Tx, actorID string, roles []string, permissions []Permission, grantedBy string) error {
	actorID = strings.TrimSpace(actorID)
	grantedBy = strings.TrimSpace(grantedBy)
	if actorID == "" || grantedBy == "" {
		return fmt.Errorf("actorID and grantedBy are required")
	}

	roleIDs := make(map[string]string, len(roles))
	for _, roleName := range roles {
		roleName = strings.TrimSpace(roleName)
		if roleName == "" {
			continue
		}
		var roleID string
		var active bool
		err := tx.QueryRowContext(ctx, `SELECT id, active FROM identity_roles WHERE name = $1`, roleName).Scan(&roleID, &active)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrRoleNotFound
		}
		if err != nil {
			return err
		}
		if !active {
			return ErrRoleInactive
		}
		roleIDs[roleName] = roleID
	}

	type permissionBinding struct{ id, scope string }
	permissionIDs := make([]permissionBinding, 0, len(permissions))
	seenPermissions := make(map[string]struct{}, len(permissions))
	for _, permission := range permissions {
		permission.Service = strings.TrimSpace(permission.Service)
		permission.Surface = strings.TrimSpace(permission.Surface)
		permission.Action = strings.TrimSpace(permission.Action)
		permission.Scope = strings.TrimSpace(permission.Scope)
		if permission.Service == "" || permission.Surface == "" || permission.Action == "" || permission.Scope == "" {
			return fmt.Errorf("permission service, surface, action, and scope are required")
		}
		key := permissionSetKey(permission)
		if _, seen := seenPermissions[key]; seen {
			continue
		}
		seenPermissions[key] = struct{}{}
		var id string
		err := tx.QueryRowContext(ctx, `SELECT id FROM identity_permission_vocabulary WHERE service = $1 AND surface = $2 AND action = $3`, permission.Service, permission.Surface, permission.Action).Scan(&id)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: %s/%s/%s", ErrPermissionNotInVocabulary, permission.Service, permission.Surface, permission.Action)
		}
		if err != nil {
			return err
		}
		permissionIDs = append(permissionIDs, permissionBinding{id: id, scope: permission.Scope})
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM identity_actor_roles WHERE actor_id = $1`, actorID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM identity_actor_direct_permissions WHERE actor_id = $1`, actorID); err != nil {
		return err
	}
	for _, roleID := range roleIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO identity_actor_roles(actor_id, role_id, granted_by) VALUES ($1, $2, $3)`, actorID, roleID, grantedBy); err != nil {
			return err
		}
	}
	for _, permission := range permissionIDs {
		if _, err := tx.ExecContext(ctx, `INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by) VALUES ($1, $2, $3, $4)`, actorID, permission.id, permission.scope, grantedBy); err != nil {
			return err
		}
	}
	_, err := tx.ExecContext(ctx, `SELECT identity_rebuild_actor_access_projection($1)`, actorID)
	return err
}

// mutateActorRoleTx is the canonical role-assignment mutation path. It keeps
// unrelated role assignments, grant provenance, and direct grants intact
// while routing every normalized role write through this boundary, followed
// by the derived projection rebuild. Callers must validate the requested
// role's lifecycle and authorization before invoking this helper.
func mutateActorRoleTx(ctx context.Context, tx *sql.Tx, actorID, roleName, roleID, grantedBy string, grant bool) (bool, error) {
	actorID = strings.TrimSpace(actorID)
	roleName = strings.TrimSpace(roleName)
	grantedBy = strings.TrimSpace(grantedBy)
	if actorID == "" || roleName == "" || grantedBy == "" {
		return false, fmt.Errorf("actorID, roleName, and grantedBy are required")
	}
	var lockedActorID string
	if err := tx.QueryRowContext(ctx, `SELECT id FROM identity_actors WHERE id = $1 FOR UPDATE`, actorID).Scan(&lockedActorID); err != nil {
		return false, err
	}

	var present bool
	if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM identity_actor_roles
			WHERE actor_id = $1 AND role_id = $2
		)`, actorID, roleID).Scan(&present); err != nil {
		return false, err
	}
	if grant {
		if present {
			return false, nil
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO identity_actor_roles(actor_id, role_id, granted_by)
			VALUES ($1, $2, $3)`, actorID, roleID, grantedBy); err != nil {
			return false, err
		}
	} else {
		if !present {
			return false, nil
		}
		if _, err := tx.ExecContext(ctx, `
			DELETE FROM identity_actor_roles
			WHERE actor_id = $1 AND role_id = $2`, actorID, roleID); err != nil {
			return false, err
		}
	}
	if _, err := tx.ExecContext(ctx, `SELECT identity_rebuild_actor_access_projection($1)`, actorID); err != nil {
		return false, err
	}
	return true, nil
}

func (r *Repository) replaceActorAccess(ctx context.Context, actorID string, roles []string, permissions []Permission, grantedBy string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := setActorAccessTx(ctx, tx, actorID, roles, permissions, grantedBy); err != nil {
		return err
	}
	return tx.Commit()
}
