package identity

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// PermissionEnforcer handles relational role-based access control (RBAC).
type PermissionEnforcer struct {
	db *sql.DB
}

func NewPermissionEnforcer(db *sql.DB) *PermissionEnforcer {
	return &PermissionEnforcer{db: db}
}

// GrantRole assigns a role to a target actor, enforcing that self-grant is prohibited.
func (e *PermissionEnforcer) GrantRole(ctx context.Context, targetActorID, roleName, requestedByActorID string) error {
	targetActorID = strings.TrimSpace(targetActorID)
	roleName = strings.TrimSpace(roleName)
	requestedByActorID = strings.TrimSpace(requestedByActorID)

	if targetActorID == `` || roleName == `` || requestedByActorID == `` {
		return fmt.Errorf(`GrantRole requires targetActorID, roleName, and requestedByActorID`)
	}

	// Prevent self-grant (a core security invariant)
	if targetActorID == requestedByActorID {
		return fmt.Errorf(`self-grant is prohibited: an actor cannot grant roles to themselves`)
	}

	tx, err := e.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Resolve the role ID
	var roleID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM identity_roles WHERE name = $1`, roleName).Scan(&roleID)
	if err == sql.ErrNoRows {
		return fmt.Errorf(`role '%s' does not exist in the vocabulary`, roleName)
	} else if err != nil {
		return err
	}

	// Insert the role assignment
	_, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actor_roles (actor_id, role_id, granted_by)
		VALUES ($1, $2, $3)
		ON CONFLICT (actor_id, role_id) DO NOTHING`,
		targetActorID, roleID, requestedByActorID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetActorPermissions resolves all active permissions for an actor from the relational model.
func (e *PermissionEnforcer) GetActorPermissions(ctx context.Context, actorID string) ([]Permission, error) {
	if strings.TrimSpace(actorID) == `` {
		return nil, fmt.Errorf(`actorID is required`)
	}

	rows, err := e.db.QueryContext(ctx, `
		SELECT v.service, v.surface, v.action, rp.scope
		FROM identity_actor_roles ar
		JOIN identity_role_permissions rp ON ar.role_id = rp.role_id
		JOIN identity_permission_vocabulary v ON rp.permission_id = v.id
		WHERE ar.actor_id = $1`, actorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.Service, &p.Surface, &p.Action, &p.Scope); err != nil {
			return nil, err
		}
		permissions = append(permissions, p)
	}
	return permissions, rows.Err()
}
