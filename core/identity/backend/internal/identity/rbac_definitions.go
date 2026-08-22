package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
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
	Permissions []Permission `json:"permissions"`
}

// PermissionAuthority exposes the existing canonical PermissionEnforcer to
// internal HTTP boundaries without allowing sibling services to write Identity
// persistence directly.
func (r *Repository) PermissionAuthority() *PermissionEnforcer {
	return NewPermissionEnforcer(r.db)
}

// ListPermissionVocabulary returns the canonical vocabulary, optionally scoped
// to one service and/or surface.
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

// UpsertRoleDefinition atomically makes one role definition exactly match the
// supplied canonical bindings. Every binding must already exist in the
// permission vocabulary; this path never invents capabilities as a side effect.
func (e *PermissionEnforcer) UpsertRoleDefinition(ctx context.Context, name, description string, permissions []Permission) (RoleDefinition, error) {
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)
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

	tx, err := e.db.BeginTx(ctx, nil)
	if err != nil {
		return RoleDefinition{}, err
	}
	defer tx.Rollback()

	permissionIDs := make([]string, len(normalized))
	for i, permission := range normalized {
		if err := tx.QueryRowContext(ctx, `
SELECT id
FROM identity_permission_vocabulary
WHERE service = $1 AND surface = $2 AND action = $3`,
			permission.Service, permission.Surface, permission.Action).Scan(&permissionIDs[i]); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return RoleDefinition{}, fmt.Errorf("%w: %s/%s/%s", ErrPermissionNotInVocabulary, permission.Service, permission.Surface, permission.Action)
			}
			return RoleDefinition{}, err
		}
	}

	var role RoleDefinition
	if err := tx.QueryRowContext(ctx, `
INSERT INTO identity_roles(name, description)
VALUES ($1, $2)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
RETURNING id, name, description`, name, description).Scan(&role.ID, &role.Name, &role.Description); err != nil {
		return RoleDefinition{}, err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM identity_role_permissions WHERE role_id = $1`, role.ID); err != nil {
		return RoleDefinition{}, err
	}
	for i, permission := range normalized {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO identity_role_permissions(role_id, permission_id, scope)
VALUES ($1, $2, $3)`, role.ID, permissionIDs[i], permission.Scope); err != nil {
			return RoleDefinition{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return RoleDefinition{}, err
	}
	return e.GetRoleDefinition(ctx, role.Name)
}

// GetRoleDefinition reads a role and all of its canonical permission bindings.
func (e *PermissionEnforcer) GetRoleDefinition(ctx context.Context, name string) (RoleDefinition, error) {
	name = strings.TrimSpace(name)
	var role RoleDefinition
	if err := e.db.QueryRowContext(ctx, `
SELECT id, name, description
FROM identity_roles
WHERE name = $1`, name).Scan(&role.ID, &role.Name, &role.Description); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return RoleDefinition{}, ErrRoleNotFound
		}
		return RoleDefinition{}, err
	}

	rows, err := e.db.QueryContext(ctx, `
SELECT vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope
FROM identity_role_permissions AS role_permission
JOIN identity_permission_vocabulary AS vocabulary ON vocabulary.id = role_permission.permission_id
WHERE role_permission.role_id = $1
ORDER BY vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope`, role.ID)
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
