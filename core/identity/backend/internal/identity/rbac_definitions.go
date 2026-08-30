package identity

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrPermissionNotInVocabulary = errors.New("permission does not exist in the canonical vocabulary")

// PermissionVocabularyEntry is one canonical service/surface/action capability.
// Scope belongs to a role binding, not to the vocabulary itself.
type PermissionVocabularyEntry struct {
	ID          string `json:"id"`
	Service     string `json:"service"`
	Surface     string `json:"surface"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

// RoleDefinition is the complete canonical Identity-owned role truth.
type RoleDefinition struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Active      bool         `json:"active"`
	Version     int          `json:"version"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
	Permissions []Permission `json:"permissions"`
}

// RoleDefinitionWriteOptions makes an Identity role mutation retry-safe.
// ExpectedVersion is 0 for a new role, or the last read version for an update.
type RoleDefinitionWriteOptions struct {
	Active          bool
	ExpectedVersion int
	IdempotencyKey  string
	Caller          string
}

// PermissionAuthority exposes the existing canonical PermissionEnforcer to
// internal HTTP boundaries without allowing sibling services to write Identity
// persistence directly.
func (r *Repository) PermissionAuthority() *PermissionEnforcer {
	return NewPermissionEnforcer(r.db)
}

func (e *PermissionEnforcer) ListPermissionVocabulary(ctx context.Context, service, surface string) ([]PermissionVocabularyEntry, error) {
	service = strings.TrimSpace(service)
	surface = strings.TrimSpace(surface)
	rows, err := e.db.QueryContext(ctx, `
SELECT id, service, surface, action, description
FROM identity_permission_vocabulary
WHERE ($1 = '' OR service = $1)
  AND ($2 = '' OR surface = $2)
ORDER BY service, surface, action`, service, surface)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := make([]PermissionVocabularyEntry, 0)
	for rows.Next() {
		var entry PermissionVocabularyEntry
		if err := rows.Scan(&entry.ID, &entry.Service, &entry.Surface, &entry.Action, &entry.Description); err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

// UpsertRoleDefinitionWithOptions atomically makes one role exactly match the
// supplied canonical bindings. It validates all permissions before mutating
// anything, conditionally advances the role version, and records the complete
// result in the durable idempotency ledger.
func (e *PermissionEnforcer) UpsertRoleDefinitionWithOptions(ctx context.Context, operatorContextID, name, description string, active bool, expectedVersion int, permissions []Permission, idempotencyKey, caller string) (RoleDefinition, error) {
	var contextErr error
	operatorContextID, contextErr = requireOperatorContextID(operatorContextID)
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	caller = strings.TrimSpace(caller)
	if contextErr != nil {
		return RoleDefinition{}, contextErr
	}
	if caller == "" {
		caller = "dsh"
	}
	if idempotencyKey == "" {
		return RoleDefinition{}, ErrIdempotencyKeyRequired
	}
	if !roleNamePattern.MatchString(name) {
		return RoleDefinition{}, ErrInvalidRoleName
	}
	if description == "" {
		return RoleDefinition{}, fmt.Errorf("description is required")
	}
	if len(permissions) == 0 {
		return RoleDefinition{}, fmt.Errorf("at least one permission is required")
	}

	normalized := make([]Permission, 0, len(permissions))
	seen := make(map[string]struct{}, len(permissions))
	for _, permission := range permissions {
		permission.Service = strings.TrimSpace(permission.Service)
		permission.Surface = strings.TrimSpace(permission.Surface)
		permission.Action = strings.TrimSpace(permission.Action)
		permission.Scope = strings.TrimSpace(permission.Scope)
		if permission.Service == "" || permission.Surface == "" || permission.Action == "" || permission.Scope == "" {
			return RoleDefinition{}, fmt.Errorf("permission service, surface, action, and scope are required")
		}
		key := permissionSetKey(permission)
		if _, duplicate := seen[key]; duplicate {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, permission)
	}
	requestHash := roleDefinitionRequestHash(operatorContextID, name, description, active, expectedVersion, normalized)
	tx, err := e.db.BeginTx(ctx, nil)
	if err != nil {
		return RoleDefinition{}, err
	}
	defer tx.Rollback()

	var ledgerHash, ledgerStatus string
	var ledgerResult []byte
	err = tx.QueryRowContext(ctx, `
INSERT INTO identity_rbac_operation_ledger(operator_context_id, caller, operation, idempotency_key, request_hash, status)
VALUES ($1, $2, 'role-definition-upsert', $3, $4, 'processing')
ON CONFLICT (operator_context_id, caller, operation, idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
RETURNING request_hash, status, result`, operatorContextID, caller, idempotencyKey, requestHash).Scan(&ledgerHash, &ledgerStatus, &ledgerResult)
	if err != nil {
		return RoleDefinition{}, err
	}
	if ledgerHash != requestHash {
		return RoleDefinition{}, ErrIdempotencyConflict
	}
	if ledgerStatus == "succeeded" {
		var role RoleDefinition
		if err := json.Unmarshal(ledgerResult, &role); err != nil {
			return RoleDefinition{}, err
		}
		return role, tx.Commit()
	}

	permissionIDs := make([]string, len(normalized))
	for i, permission := range normalized {
		if err := tx.QueryRowContext(ctx, `SELECT id FROM identity_permission_vocabulary WHERE service = $1 AND surface = $2 AND action = $3`, permission.Service, permission.Surface, permission.Action).Scan(&permissionIDs[i]); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return RoleDefinition{}, fmt.Errorf("%w: %s/%s/%s", ErrPermissionNotInVocabulary, permission.Service, permission.Surface, permission.Action)
			}
			return RoleDefinition{}, err
		}
	}

	var roleID string
	var role RoleDefinition
	err = tx.QueryRowContext(ctx, `SELECT id, name, description, active, version, created_at, updated_at FROM identity_roles WHERE name = $1 FOR UPDATE`, name).Scan(&roleID, &role.Name, &role.Description, &role.Active, &role.Version, &role.CreatedAt, &role.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		if expectedVersion > 0 {
			return RoleDefinition{}, ErrRoleVersionConflict
		}
		if err := tx.QueryRowContext(ctx, `INSERT INTO identity_roles(name, description, active, version) VALUES ($1, $2, $3, 1) RETURNING id, name, description, active, version, created_at, updated_at`, name, description, active).Scan(&roleID, &role.Name, &role.Description, &role.Active, &role.Version, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return RoleDefinition{}, err
		}
	} else if err != nil {
		return RoleDefinition{}, err
	} else {
		if expectedVersion >= 0 && role.Version != expectedVersion {
			return RoleDefinition{}, ErrRoleVersionConflict
		}
		if err := tx.QueryRowContext(ctx, `UPDATE identity_roles SET description = $2, active = $3, version = version + 1, updated_at = now() WHERE id = $1 RETURNING id, name, description, active, version, created_at, updated_at`, roleID, description, active).Scan(&roleID, &role.Name, &role.Description, &role.Active, &role.Version, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return RoleDefinition{}, err
		}
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM identity_role_permissions WHERE role_id = $1`, roleID); err != nil {
		return RoleDefinition{}, err
	}
	for i, permission := range normalized {
		if _, err := tx.ExecContext(ctx, `INSERT INTO identity_role_permissions(role_id, permission_id, scope) VALUES ($1, $2, $3)`, roleID, permissionIDs[i], permission.Scope); err != nil {
			return RoleDefinition{}, err
		}
	}
	role.ID = roleID
	role.Permissions, err = getRolePermissionsTx(ctx, tx, roleID)
	if err != nil {
		return RoleDefinition{}, err
	}
	encoded, err := json.Marshal(role)
	if err != nil {
		return RoleDefinition{}, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE identity_rbac_operation_ledger SET status = 'succeeded', result = $4::jsonb, updated_at = now() WHERE operator_context_id = $1 AND caller = $2 AND operation = 'role-definition-upsert' AND idempotency_key = $3 AND request_hash = $5`, operatorContextID, caller, idempotencyKey, string(encoded), requestHash); err != nil {
		return RoleDefinition{}, err
	}
	if err := tx.Commit(); err != nil {
		return RoleDefinition{}, err
	}
	return role, nil
}

func roleDefinitionRequestHash(operatorContextID, name, description string, active bool, expectedVersion int, permissions []Permission) string {
	h := sha256.New()
	fmt.Fprintf(h, "%s\x00%s\x00%s\x00%t\x00%d\x00", operatorContextID, name, description, active, expectedVersion)
	for _, permission := range permissions {
		fmt.Fprintf(h, "%s\x00", permissionSetKey(permission))
	}
	return hex.EncodeToString(h.Sum(nil))
}

func getRolePermissionsTx(ctx context.Context, tx *sql.Tx, roleID string) ([]Permission, error) {
	rows, err := tx.QueryContext(ctx, `SELECT vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope FROM identity_role_permissions AS role_permission JOIN identity_permission_vocabulary AS vocabulary ON vocabulary.id = role_permission.permission_id WHERE role_permission.role_id = $1 ORDER BY vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	permissions := make([]Permission, 0)
	for rows.Next() {
		var permission Permission
		if err := rows.Scan(&permission.Service, &permission.Surface, &permission.Action, &permission.Scope); err != nil {
			return nil, err
		}
		permissions = append(permissions, permission)
	}
	return permissions, rows.Err()
}

func (e *PermissionEnforcer) GetRoleDefinition(ctx context.Context, name string) (RoleDefinition, error) {
	name = strings.TrimSpace(name)
	var role RoleDefinition
	if err := e.db.QueryRowContext(ctx, `SELECT id, name, description, active, version, created_at, updated_at FROM identity_roles WHERE name = $1`, name).Scan(&role.ID, &role.Name, &role.Description, &role.Active, &role.Version, &role.CreatedAt, &role.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return RoleDefinition{}, ErrRoleNotFound
		}
		return RoleDefinition{}, err
	}
	rows, err := e.db.QueryContext(ctx, `SELECT vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope FROM identity_role_permissions AS role_permission JOIN identity_permission_vocabulary AS vocabulary ON vocabulary.id = role_permission.permission_id WHERE role_permission.role_id = $1 ORDER BY vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope`, role.ID)
	if err != nil {
		return RoleDefinition{}, err
	}
	defer rows.Close()
	role.Permissions = make([]Permission, 0)
	for rows.Next() {
		var permission Permission
		if err := rows.Scan(&permission.Service, &permission.Surface, &permission.Action, &permission.Scope); err != nil {
			return RoleDefinition{}, err
		}
		role.Permissions = append(role.Permissions, permission)
	}
	if err := rows.Err(); err != nil {
		return RoleDefinition{}, err
	}
	return role, nil
}
