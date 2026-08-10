package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/lib/pq"
)

var (
	// ErrSelfGrantProhibited is returned when an actor attempts to grant or
	// revoke a role on themselves — a core security invariant.
	ErrSelfGrantProhibited = errors.New(`self-grant is prohibited: an actor cannot grant or revoke roles on themselves`)
	// ErrRoleNotFound is returned when a referenced role name does not exist
	// in the durable role vocabulary.
	ErrRoleNotFound = errors.New(`role does not exist in the vocabulary`)
	// ErrRoleAlreadyExists is returned when a role name collides with an
	// existing durable role definition.
	ErrRoleAlreadyExists = errors.New(`role already exists`)
	// ErrInvalidRoleName is returned when a role name fails the canonical
	// naming pattern shared with the DSH-facing contract.
	ErrInvalidRoleName = errors.New(`invalid role name`)
)

var roleNamePattern = regexp.MustCompile(`^[a-z][a-z0-9_-]{2,79}$`)

// PermissionEnforcer handles relational role-based access control (RBAC).
// It is the sole durable writer of role definitions and actor role
// assignments; DSH and every other consumer act only through this boundary.
type PermissionEnforcer struct {
	db *sql.DB
}

func NewPermissionEnforcer(db *sql.DB) *PermissionEnforcer {
	return &PermissionEnforcer{db: db}
}

// RbacRole is a durable role definition.
type RbacRole struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// ActorRoleAssignment is a durable actor→role grant.
type ActorRoleAssignment struct {
	ActorID   string `json:"actorId"`
	RoleID    string `json:"roleId"`
	RoleName  string `json:"roleName"`
	GrantedBy string `json:"grantedBy"`
}

// ListRoles returns every durable role definition.
func (e *PermissionEnforcer) ListRoles(ctx context.Context) ([]RbacRole, error) {
	rows, err := e.db.QueryContext(ctx, `SELECT id, name, description FROM identity_roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []RbacRole
	for rows.Next() {
		var role RbacRole
		if err := rows.Scan(&role.ID, &role.Name, &role.Description); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

// CreateRole creates a new durable role definition. It is the only path by
// which a role name may become active; DSH must call this instead of
// writing a local role table.
func (e *PermissionEnforcer) CreateRole(ctx context.Context, name, description string) (RbacRole, error) {
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)
	if !roleNamePattern.MatchString(name) {
		return RbacRole{}, ErrInvalidRoleName
	}
	if description == `` {
		return RbacRole{}, fmt.Errorf(`description is required`)
	}

	var role RbacRole
	err := e.db.QueryRowContext(ctx, `
		INSERT INTO identity_roles (name, description)
		VALUES ($1, $2)
		RETURNING id, name, description`,
		name, description).Scan(&role.ID, &role.Name, &role.Description)
	if err != nil {
		if isUniqueViolation(err) {
			return RbacRole{}, ErrRoleAlreadyExists
		}
		return RbacRole{}, err
	}
	return role, nil
}

// GrantRole assigns a role to a target actor, enforcing that self-grant is
// prohibited. Idempotent: granting an already-held role succeeds without
// error and reports whether a new row was inserted.
func (e *PermissionEnforcer) GrantRole(ctx context.Context, targetActorID, roleName, requestedByActorID string) (ActorRoleAssignment, bool, error) {
	targetActorID = strings.TrimSpace(targetActorID)
	roleName = strings.TrimSpace(roleName)
	requestedByActorID = strings.TrimSpace(requestedByActorID)

	if targetActorID == `` || roleName == `` || requestedByActorID == `` {
		return ActorRoleAssignment{}, false, fmt.Errorf(`GrantRole requires targetActorID, roleName, and requestedByActorID`)
	}

	// Prevent self-grant (a core security invariant)
	if targetActorID == requestedByActorID {
		return ActorRoleAssignment{}, false, ErrSelfGrantProhibited
	}

	tx, err := e.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorRoleAssignment{}, false, err
	}
	defer tx.Rollback()

	// Resolve the role ID
	var roleID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM identity_roles WHERE name = $1`, roleName).Scan(&roleID)
	if err == sql.ErrNoRows {
		return ActorRoleAssignment{}, false, ErrRoleNotFound
	} else if err != nil {
		return ActorRoleAssignment{}, false, err
	}

	// Insert the role assignment
	res, err := tx.ExecContext(ctx, `
		INSERT INTO identity_actor_roles (actor_id, role_id, granted_by)
		VALUES ($1, $2, $3)
		ON CONFLICT (actor_id, role_id) DO NOTHING`,
		targetActorID, roleID, requestedByActorID)
	if err != nil {
		return ActorRoleAssignment{}, false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return ActorRoleAssignment{}, false, err
	}

	if err := tx.Commit(); err != nil {
		return ActorRoleAssignment{}, false, err
	}

	return ActorRoleAssignment{
		ActorID:   targetActorID,
		RoleID:    roleID,
		RoleName:  roleName,
		GrantedBy: requestedByActorID,
	}, rows > 0, nil
}

// RevokeRole removes a role assignment from a target actor, enforcing that
// self-revoke is prohibited. Idempotent: revoking an absent assignment
// succeeds without error.
func (e *PermissionEnforcer) RevokeRole(ctx context.Context, targetActorID, roleName, requestedByActorID string) error {
	targetActorID = strings.TrimSpace(targetActorID)
	roleName = strings.TrimSpace(roleName)
	requestedByActorID = strings.TrimSpace(requestedByActorID)

	if targetActorID == `` || roleName == `` || requestedByActorID == `` {
		return fmt.Errorf(`RevokeRole requires targetActorID, roleName, and requestedByActorID`)
	}
	if targetActorID == requestedByActorID {
		return ErrSelfGrantProhibited
	}

	var roleID string
	err := e.db.QueryRowContext(ctx, `SELECT id FROM identity_roles WHERE name = $1`, roleName).Scan(&roleID)
	if err == sql.ErrNoRows {
		return ErrRoleNotFound
	} else if err != nil {
		return err
	}

	_, err = e.db.ExecContext(ctx, `
		DELETE FROM identity_actor_roles WHERE actor_id = $1 AND role_id = $2`,
		targetActorID, roleID)
	return err
}

// StaffActor is an Identity actor holding at least one durable role
// assignment — the canonical "who is staff and what can they do" projection.
// DSH's administration staff listing must read this rather than maintain
// its own copy of who has been granted access.
type StaffActor struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Roles     []string  `json:"roles"`
	GrantedAt time.Time `json:"grantedAt"`
}

// ListStaffActors returns every actor with at least one durable role
// assignment, grouped with their role names and earliest grant time.
func (e *PermissionEnforcer) ListStaffActors(ctx context.Context) ([]StaffActor, error) {
	rows, err := e.db.QueryContext(ctx, `
		SELECT a.id, a.username, array_agg(r.name ORDER BY r.name), MIN(ar.created_at)
		FROM identity_actor_roles ar
		JOIN identity_actors a ON a.id = ar.actor_id
		JOIN identity_roles r ON r.id = ar.role_id
		GROUP BY a.id, a.username
		ORDER BY a.username`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var staff []StaffActor
	for rows.Next() {
		var actor StaffActor
		if err := rows.Scan(&actor.ID, &actor.Username, pq.Array(&actor.Roles), &actor.GrantedAt); err != nil {
			return nil, err
		}
		staff = append(staff, actor)
	}
	return staff, rows.Err()
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), `duplicate key value violates unique constraint`)
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
