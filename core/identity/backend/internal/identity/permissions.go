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

func (e *PermissionEnforcer) GrantRoleWithIdempotency(ctx context.Context, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int, idempotencyKey, caller string) (ActorRoleAssignment, bool, error) {
	targetActorID = strings.TrimSpace(targetActorID)
	roleName = strings.TrimSpace(roleName)
	requestedByActorID = strings.TrimSpace(requestedByActorID)

	if targetActorID == `` || roleName == `` || requestedByActorID == `` || expectedRoleVersion < 1 {
		return ActorRoleAssignment{}, false, fmt.Errorf(`GrantRole requires targetActorID, roleName, requestedByActorID, and expectedRoleVersion`)
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
	requestHash := roleMutationRequestHash("grant", targetActorID, roleName, requestedByActorID, expectedRoleVersion)
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

	// Resolve and fence the exact canonical role definition in the same
	// transaction that writes the durable assignment.
	var roleID string
	var roleActive bool
	var roleVersion int
	err = tx.QueryRowContext(ctx, `SELECT id, active, version FROM identity_roles WHERE name = $1 FOR SHARE`, roleName).Scan(&roleID, &roleActive, &roleVersion)
	if err == sql.ErrNoRows {
		return ActorRoleAssignment{}, false, ErrRoleNotFound
	} else if err != nil {
		return ActorRoleAssignment{}, false, err
	}
	if roleVersion != expectedRoleVersion {
		return ActorRoleAssignment{}, false, ErrRoleVersionConflict
	}
	if !roleActive {
		return ActorRoleAssignment{}, false, ErrRoleInactive
	}

	if strings.TrimSpace(idempotencyKey) == "" {
		return ActorRoleAssignment{}, false, ErrIdempotencyKeyRequired
	}
	// All normalized actor-role writes are owned by the canonical access
	// boundary. The helper preserves unrelated assignments and direct grants,
	// then rebuilds the derived actor projection transactionally.
	created, err := mutateActorRoleTx(ctx, tx, targetActorID, roleName, roleID, requestedByActorID, true)
	if err != nil {
		return ActorRoleAssignment{}, false, err
	}

	resultJSON, err := json.Marshal(struct {
		Assignment ActorRoleAssignment `json:"assignment"`
		Created    bool                `json:"created"`
	}{ActorRoleAssignment{ActorID: targetActorID, RoleID: roleID, RoleName: roleName, GrantedBy: requestedByActorID}, created})
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
	}, created, nil
}

func (e *PermissionEnforcer) RevokeRoleWithIdempotency(ctx context.Context, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int, idempotencyKey, caller string) error {
	targetActorID = strings.TrimSpace(targetActorID)
	roleName = strings.TrimSpace(roleName)
	requestedByActorID = strings.TrimSpace(requestedByActorID)

	if targetActorID == `` || roleName == `` || requestedByActorID == `` || expectedRoleVersion < 1 {
		return fmt.Errorf(`RevokeRole requires targetActorID, roleName, requestedByActorID, and expectedRoleVersion`)
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
	requestHash := roleMutationRequestHash("revoke", targetActorID, roleName, requestedByActorID, expectedRoleVersion)
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
	var roleVersion int
	err = tx.QueryRowContext(ctx, `SELECT id, version FROM identity_roles WHERE name = $1 FOR SHARE`, roleName).Scan(&roleID, &roleVersion)
	if err == sql.ErrNoRows {
		return ErrRoleNotFound
	} else if err != nil {
		return err
	}
	if roleVersion != expectedRoleVersion {
		return ErrRoleVersionConflict
	}

	if _, err := mutateActorRoleTx(ctx, tx, targetActorID, roleName, roleID, requestedByActorID, false); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE identity_rbac_operation_ledger SET status = 'succeeded', result = '{"revoked":true}'::jsonb, updated_at = now() WHERE caller = $1 AND operation = 'role-revoke' AND idempotency_key = $2 AND request_hash = $3`, caller, idempotencyKey, requestHash); err != nil {
		return err
	}
	return tx.Commit()
}

func roleMutationRequestHash(operation, targetActorID, roleName, requestedByActorID string, expectedRoleVersion int) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s\x00%s\x00%s\x00%s\x00%d", operation, targetActorID, roleName, requestedByActorID, expectedRoleVersion)))
	return hex.EncodeToString(h[:])
}

// StaffActor is an Identity actor holding at least one effective assignment to
// an active role — the canonical "who is active staff" projection. Durable
// assignments, including assignments to inactive roles, are read separately
// through ListActorRoleAssignments.
type StaffActor struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Roles     []string  `json:"roles"`
	GrantedAt time.Time `json:"grantedAt"`
}

// ListStaffActors returns every actor with at least one effective assignment
// to an active role, grouped with active role names and earliest grant time.
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

// ListActorRoleAssignments returns the actor's durable role assignments,
// including assignments to inactive roles. It is a canonical membership
// readback, independent from executable/effective authority projections.
func (e *PermissionEnforcer) ListActorRoleAssignments(ctx context.Context, actorID string) ([]ActorRoleAssignment, error) {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, fmt.Errorf("actorID is required")
	}
	rows, err := e.db.QueryContext(ctx, `
		SELECT assignment.actor_id, assignment.role_id, role.name, assignment.granted_by
		FROM identity_actor_roles assignment
		JOIN identity_roles role ON role.id = assignment.role_id
		WHERE assignment.actor_id = $1
		ORDER BY role.name`, actorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	assignments := make([]ActorRoleAssignment, 0)
	for rows.Next() {
		var assignment ActorRoleAssignment
		if err := rows.Scan(&assignment.ActorID, &assignment.RoleID, &assignment.RoleName, &assignment.GrantedBy); err != nil {
			return nil, err
		}
		assignments = append(assignments, assignment)
	}
	return assignments, rows.Err()
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
