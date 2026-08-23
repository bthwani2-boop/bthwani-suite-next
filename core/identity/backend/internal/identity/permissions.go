package identity

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
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
	ErrInvalidRoleName        = errors.New(`invalid role name`)
	ErrRoleInactive           = errors.New(`role is inactive`)
	ErrIdempotencyKeyRequired = errors.New(`Idempotency-Key is required`)
	ErrIdempotencyConflict    = errors.New(`Idempotency-Key was already used with a different request`)
	ErrRoleVersionConflict    = errors.New(`role definition version conflict`)
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
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Active      bool      `json:"active"`
	Version     int       `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
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
	rows, err := e.db.QueryContext(ctx, `SELECT id, name, description, active, version, created_at, updated_at FROM identity_roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []RbacRole
	for rows.Next() {
		var role RbacRole
		if err := rows.Scan(&role.ID, &role.Name, &role.Description, &role.Active, &role.Version, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

func (e *PermissionEnforcer) GrantRoleWithIdempotency(ctx context.Context, targetActorID, roleName, requestedByActorID, idempotencyKey, caller string) (ActorRoleAssignment, bool, error) {
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
	requestHash := roleMutationRequestHash("grant", targetActorID, roleName, requestedByActorID)
	var ledgerHash, ledgerStatus string
	var ledgerResult []byte
	if err := tx.QueryRowContext(ctx, `
INSERT INTO identity_rbac_operation_ledger(caller, operation, idempotency_key, request_hash, status)
VALUES ($1, 'role-grant', $2, $3, 'processing')
ON CONFLICT (caller, operation, idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
RETURNING request_hash, status, result`, caller, idempotencyKey, requestHash).Scan(&ledgerHash, &ledgerStatus, &ledgerResult); err != nil {
		return ActorRoleAssignment{}, false, err
	}
	if ledgerHash != requestHash {
		return ActorRoleAssignment{}, false, ErrIdempotencyConflict
	}
	if ledgerStatus == "succeeded" {
		var result struct {
			Assignment ActorRoleAssignment `json:"assignment"`
			Created    bool                `json:"created"`
		}
		if err := json.Unmarshal(ledgerResult, &result); err != nil {
			return ActorRoleAssignment{}, false, err
		}
		return result.Assignment, result.Created, tx.Commit()
	}

	// Resolve the role ID
	var roleID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM identity_roles WHERE name = $1 AND active = true`, roleName).Scan(&roleID)
	if err == sql.ErrNoRows {
		var inactive bool
		if scanErr := tx.QueryRowContext(ctx, `SELECT active FROM identity_roles WHERE name = $1`, roleName).Scan(&inactive); scanErr == nil && !inactive {
			return ActorRoleAssignment{}, false, ErrRoleInactive
		}
		return ActorRoleAssignment{}, false, ErrRoleNotFound
	} else if err != nil {
		return ActorRoleAssignment{}, false, err
	}

	// Insert the role assignment
	if strings.TrimSpace(idempotencyKey) == "" {
		return ActorRoleAssignment{}, false, ErrIdempotencyKeyRequired
	}
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

	resultJSON, err := json.Marshal(struct {
		Assignment ActorRoleAssignment `json:"assignment"`
		Created    bool                `json:"created"`
	}{ActorRoleAssignment{ActorID: targetActorID, RoleID: roleID, RoleName: roleName, GrantedBy: requestedByActorID}, rows > 0})
	if err != nil {
		return ActorRoleAssignment{}, false, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE identity_rbac_operation_ledger SET status = 'succeeded', result = $4::jsonb, updated_at = now() WHERE caller = $1 AND operation = 'role-grant' AND idempotency_key = $2 AND request_hash = $3`, caller, idempotencyKey, requestHash, string(resultJSON)); err != nil {
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

func (e *PermissionEnforcer) RevokeRoleWithIdempotency(ctx context.Context, targetActorID, roleName, requestedByActorID, idempotencyKey, caller string) error {
	targetActorID = strings.TrimSpace(targetActorID)
	roleName = strings.TrimSpace(roleName)
	requestedByActorID = strings.TrimSpace(requestedByActorID)

	if targetActorID == `` || roleName == `` || requestedByActorID == `` {
		return fmt.Errorf(`RevokeRole requires targetActorID, roleName, and requestedByActorID`)
	}
	if targetActorID == requestedByActorID {
		return ErrSelfGrantProhibited
	}

	if strings.TrimSpace(idempotencyKey) == "" {
		return ErrIdempotencyKeyRequired
	}
	tx, err := e.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	requestHash := roleMutationRequestHash("revoke", targetActorID, roleName, requestedByActorID)
	var ledgerHash, ledgerStatus string
	var ledgerResult []byte
	if err := tx.QueryRowContext(ctx, `
INSERT INTO identity_rbac_operation_ledger(caller, operation, idempotency_key, request_hash, status)
VALUES ($1, 'role-revoke', $2, $3, 'processing')
ON CONFLICT (caller, operation, idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
RETURNING request_hash, status, result`, caller, idempotencyKey, requestHash).Scan(&ledgerHash, &ledgerStatus, &ledgerResult); err != nil {
		return err
	}
	if ledgerHash != requestHash {
		return ErrIdempotencyConflict
	}
	if ledgerStatus == "succeeded" {
		return tx.Commit()
	}
	var roleID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM identity_roles WHERE name = $1 AND active = true`, roleName).Scan(&roleID)
	if err == sql.ErrNoRows {
		var inactive bool
		if scanErr := tx.QueryRowContext(ctx, `SELECT active FROM identity_roles WHERE name = $1`, roleName).Scan(&inactive); scanErr == nil && !inactive {
			return ErrRoleInactive
		}
		return ErrRoleNotFound
	} else if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		DELETE FROM identity_actor_roles WHERE actor_id = $1 AND role_id = $2`,
		targetActorID, roleID)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE identity_rbac_operation_ledger SET status = 'succeeded', result = '{"revoked":true}'::jsonb, updated_at = now() WHERE caller = $1 AND operation = 'role-revoke' AND idempotency_key = $2 AND request_hash = $3`, caller, idempotencyKey, requestHash); err != nil {
		return err
	}
	return tx.Commit()
}

func roleMutationRequestHash(operation, targetActorID, roleName, requestedByActorID string) string {
	h := sha256.Sum256([]byte(operation + "\x00" + targetActorID + "\x00" + roleName + "\x00" + requestedByActorID))
	return hex.EncodeToString(h[:])
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
		JOIN identity_roles r ON r.id = ar.role_id AND r.active = true
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

// GetActorPermissions resolves the actor's complete executable authority from
// the canonical access model: actor-specific direct grants plus every grant
// inherited through an assigned role. The identity_actors.permissions column
// is only a materialized read projection and is never queried here as an
// independent source of truth.
func (e *PermissionEnforcer) GetActorPermissions(ctx context.Context, actorID string) ([]Permission, error) {
	if strings.TrimSpace(actorID) == `` {
		return nil, fmt.Errorf(`actorID is required`)
	}

	rows, err := e.db.QueryContext(ctx, `
		SELECT service, surface, action, scope
		FROM (
			SELECT v.service, v.surface, v.action, direct_permission.scope
			FROM identity_actor_direct_permissions direct_permission
			JOIN identity_permission_vocabulary v ON v.id = direct_permission.permission_id
			WHERE direct_permission.actor_id = $1

			UNION

			SELECT v.service, v.surface, v.action, role_permission.scope
			FROM identity_actor_roles actor_role
			JOIN identity_role_permissions role_permission ON actor_role.role_id = role_permission.role_id
			JOIN identity_permission_vocabulary v ON v.id = role_permission.permission_id
			WHERE actor_role.actor_id = $1 AND role_permission.role_id IN (SELECT id FROM identity_roles WHERE active = true)
		) effective_permission
		ORDER BY service, surface, action, scope`, actorID)
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
