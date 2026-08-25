package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

func permissionSetKey(permission Permission) string {
	return permission.Service + "\x00" + permission.Surface + "\x00" + permission.Action + "\x00" + permission.Scope
}

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

// ReplaceActorAccess applies an exact normalized access set and rebuilds the
// derived actor projection. It does not create role or permission vocabulary.
func (r *Repository) ReplaceActorAccess(ctx context.Context, actorID string, roles []string, permissions []Permission, grantedBy string) error {
	return r.replaceActorAccess(ctx, actorID, roles, permissions, grantedBy)
}

// UpsertActorWithAccess atomically creates or updates an actor and assigns its
// normalized access through the canonical RBAC writer. Development fixture
// orchestration lives outside the Identity API and calls this generic seam.
func (r *Repository) UpsertActorWithAccess(ctx context.Context, input ActorAccessProvisionInput) error {
	if r == nil || r.db == nil {
		return fmt.Errorf("identity actor provisioning requires a database")
	}
	if strings.TrimSpace(input.ID) == "" || strings.TrimSpace(input.Username) == "" ||
		strings.TrimSpace(input.PasswordHash) == "" || strings.TrimSpace(input.OperatorContextID) == "" ||
		strings.TrimSpace(input.GrantedBy) == "" {
		return fmt.Errorf("actor id, username, password hash, operator context, and grant provenance are required")
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
INSERT INTO identity_actors
    (id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version, updated_at)
VALUES ($1, $2, $3, $4, NULLIF($5, ''), ARRAY[]::text[], '[]'::jsonb, 'ACTIVE', 1, now())
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    operator_context_id = EXCLUDED.operator_context_id,
    phone_e164 = EXCLUDED.phone_e164,
    status = 'ACTIVE',
    version = identity_actors.version + 1,
    updated_at = now()`,
		input.ID, input.Username, input.PasswordHash, input.OperatorContextID, input.PhoneE164,
	); err != nil {
		return err
	}

	if err := setActorAccessTx(ctx, tx, input.ID, input.Roles, input.Permissions, input.GrantedBy); err != nil {
		return err
	}
	return tx.Commit()
}
