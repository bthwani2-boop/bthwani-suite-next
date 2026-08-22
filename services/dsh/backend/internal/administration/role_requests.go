package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"dsh-api/internal/auth"
)

type RoleDefinitionRequest struct {
	ID          string     `json:"id"`
	RoleName    string     `json:"roleName"`
	Description string     `json:"description"`
	Permissions []string   `json:"permissions"`
	Surfaces    []string   `json:"surfaces,omitempty"`
	RequestedBy string     `json:"requestedBy"`
	Reason      string     `json:"reason"`
	Status      string     `json:"status"`
	ReviewedBy  *string    `json:"reviewedBy,omitempty"`
	ReviewNote  *string    `json:"reviewNote,omitempty"`
	Version     int        `json:"version"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	ReviewedAt  *time.Time `json:"reviewedAt,omitempty"`
}

type CreateRoleDefinitionParams struct {
	RoleName    string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
	Surfaces    []string `json:"surfaces"`
	Reason      string   `json:"reason"`
}

func normalizeAdministrationRoleSurfaces(surfaces []string) ([]string, error) {
	if len(surfaces) == 0 {
		return []string{"control-panel"}, nil
	}
	if len(surfaces) != 1 || strings.TrimSpace(surfaces[0]) != "control-panel" {
		return nil, ErrInvalid
	}
	return []string{"control-panel"}, nil
}

func canonicalPermissionsForRoleRequest(ctx context.Context, identityClient *auth.Client, actions []string, surfaces []string) ([]auth.Permission, []string, error) {
	if identityClient == nil {
		return nil, nil, ErrIdentityUnavailable
	}
	normalizedSurfaces, err := normalizeAdministrationRoleSurfaces(surfaces)
	if err != nil {
		return nil, nil, err
	}
	if len(actions) == 0 {
		return nil, nil, ErrInvalid
	}

	vocabulary, err := identityClient.ListPermissionVocabulary(ctx, "dsh", "control-panel")
	if err != nil {
		return nil, nil, ErrIdentityUnavailable
	}
	allowedActions := make(map[string]struct{}, len(vocabulary))
	for _, entry := range vocabulary {
		allowedActions[entry.Action] = struct{}{}
	}

	actionSet := make(map[string]struct{}, len(actions))
	for _, rawAction := range actions {
		action := strings.TrimSpace(rawAction)
		if action == "" {
			return nil, nil, ErrInvalid
		}
		if _, allowed := allowedActions[action]; !allowed {
			return nil, nil, ErrInvalid
		}
		actionSet[action] = struct{}{}
	}
	normalizedActions := make([]string, 0, len(actionSet))
	for action := range actionSet {
		normalizedActions = append(normalizedActions, action)
	}
	sort.Strings(normalizedActions)

	permissions := make([]auth.Permission, 0, len(normalizedActions))
	for _, action := range normalizedActions {
		permissions = append(permissions, auth.Permission{
			Service: "dsh",
			Surface: "control-panel",
			Action:  action,
			Scope:   "assigned",
		})
	}
	return permissions, normalizedActions, nil
}

func permissionKey(permission auth.Permission) string {
	return strings.Join([]string{permission.Service, permission.Surface, permission.Action, permission.Scope}, "\x1f")
}

func roleDefinitionMatchesRequest(definition auth.RbacRoleDefinition, req RoleDefinitionRequest, expected []auth.Permission) bool {
	if definition.Name != req.RoleName || definition.Description != req.Description || len(definition.Permissions) != len(expected) {
		return false
	}
	expectedSet := make(map[string]struct{}, len(expected))
	for _, permission := range expected {
		expectedSet[permissionKey(permission)] = struct{}{}
	}
	for _, permission := range definition.Permissions {
		if _, ok := expectedSet[permissionKey(permission)]; !ok {
			return false
		}
	}
	return true
}

func CreateRoleDefinitionRequest(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID string, params CreateRoleDefinitionParams) (*RoleDefinitionRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	params.RoleName = strings.TrimSpace(params.RoleName)
	params.Description = strings.TrimSpace(params.Description)
	if len(params.RoleName) < 3 || len(params.RoleName) > 80 {
		return nil, errors.New("invalid role name length")
	}
	if params.Description == "" {
		return nil, ErrInvalid
	}
	if len(strings.TrimSpace(params.Reason)) < 5 {
		return nil, errors.New("reason too short")
	}

	_, normalizedActions, err := canonicalPermissionsForRoleRequest(ctx, identityClient, params.Permissions, params.Surfaces)
	if err != nil {
		return nil, err
	}
	params.Permissions = normalizedActions
	params.Surfaces = []string{"control-panel"}

	permissionsJSON, err := json.Marshal(params.Permissions)
	if err != nil {
		return nil, err
	}
	surfacesJSON, err := json.Marshal(params.Surfaces)
	if err != nil {
		return nil, err
	}

	var req RoleDefinitionRequest
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_role_definition_requests
			(role_name, description, permissions, surfaces, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		RETURNING id, role_name, description, permissions, surfaces, requested_by, reason, status, version, created_at, updated_at
	`, params.RoleName, params.Description, permissionsJSON, surfacesJSON, actorID, params.Reason).Scan(
		&req.ID, &req.RoleName, &req.Description, &permissionsJSON, &surfacesJSON,
		&req.RequestedBy, &req.Reason, &req.Status, &req.Version, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(permissionsJSON, &req.Permissions); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(surfacesJSON, &req.Surfaces); err != nil {
		return nil, err
	}

	_, _ = db.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLE_DEFINITION_REQUESTED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Requested canonical role: "+req.RoleName, req.ID)

	return &req, nil
}

func ListRoleDefinitionRequests(ctx context.Context, db *sql.DB, status string) ([]RoleDefinitionRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}

	query := `
		SELECT id, role_name, description, permissions, surfaces, requested_by, reason, status,
		       reviewed_by, review_note, version, created_at, updated_at, reviewed_at
		FROM dsh_admin_role_definition_requests
	`
	args := []interface{}{}
	if status != "" {
		query += ` WHERE status = $1 `
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]RoleDefinitionRequest, 0)
	for rows.Next() {
		var req RoleDefinitionRequest
		var permissionsJSON, surfacesJSON []byte
		if err := rows.Scan(
			&req.ID, &req.RoleName, &req.Description, &permissionsJSON, &surfacesJSON, &req.RequestedBy, &req.Reason, &req.Status,
			&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(permissionsJSON, &req.Permissions); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(surfacesJSON, &req.Surfaces); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

type ReviewDecisionParams struct {
	Decision        string `json:"decision"`
	ReviewNote      string `json:"reviewNote"`
	ExpectedVersion int    `json:"expectedVersion"`
}

// ReviewRoleDefinitionRequest reviews a pending role-definition request. An
// approval writes the complete role definition only through Identity, performs
// an independent canonical readback, and updates the maker/checker request only
// after that exact readback matches. DSH never writes dsh_admin_roles here.
func ReviewRoleDefinitionRequest(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID string, requestID string, params ReviewDecisionParams) (*RoleDefinitionRequest, *Role, error) {
	if db == nil {
		return nil, nil, ErrInvalid
	}
	if params.Decision != "approved" && params.Decision != "rejected" {
		return nil, nil, errors.New("invalid decision")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	var req RoleDefinitionRequest
	var permissionsJSON, surfacesJSON []byte
	err = tx.QueryRowContext(ctx, `
		SELECT id, role_name, description, permissions, surfaces, requested_by, reason, status, version
		FROM dsh_admin_role_definition_requests
		WHERE id = $1 FOR UPDATE
	`, requestID).Scan(
		&req.ID, &req.RoleName, &req.Description, &permissionsJSON, &surfacesJSON, &req.RequestedBy, &req.Reason, &req.Status, &req.Version,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}

	if req.Status != "pending" {
		return nil, nil, errors.New("request is not pending")
	}
	if req.Version != params.ExpectedVersion {
		return nil, nil, errors.New("version conflict")
	}
	if req.RequestedBy == actorID {
		return nil, nil, errors.New("cannot review own request")
	}

	if err := json.Unmarshal(permissionsJSON, &req.Permissions); err != nil {
		return nil, nil, ErrInvalid
	}
	if err := json.Unmarshal(surfacesJSON, &req.Surfaces); err != nil {
		return nil, nil, ErrInvalid
	}

	var canonicalRole *Role
	if params.Decision == "approved" {
		permissions, normalizedActions, err := canonicalPermissionsForRoleRequest(ctx, identityClient, req.Permissions, req.Surfaces)
		if err != nil {
			return nil, nil, err
		}
		req.Permissions = normalizedActions
		req.Surfaces = []string{"control-panel"}

		if _, err := identityClient.UpsertRoleDefinition(ctx, req.RoleName, req.Description, permissions); err != nil {
			if errors.Is(err, auth.ErrIdentityUnavailable) {
				return nil, nil, ErrIdentityUnavailable
			}
			return nil, nil, ErrCanonicalMutationFailed
		}
		readback, err := identityClient.GetRoleDefinition(ctx, req.RoleName)
		if err != nil {
			return nil, nil, ErrIdentityUnavailable
		}
		if !roleDefinitionMatchesRequest(readback, req, permissions) {
			return nil, nil, ErrCanonicalMutationFailed
		}
		role := roleFromCanonical(readback)
		canonicalRole = &role
	}

	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_role_definition_requests
		SET status = $1, reviewed_by = $2, review_note = $3, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
		WHERE id = $4
		RETURNING version, updated_at, reviewed_at
	`, params.Decision, actorID, params.ReviewNote, requestID).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt)
	if err != nil {
		return nil, nil, err
	}

	req.Status = params.Decision
	reviewer := actorID
	req.ReviewedBy = &reviewer
	req.ReviewNote = &params.ReviewNote

	_, _ = tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, $2, $3, $4, 'HIGH', $5)
	`, actorID, "ROLE_DEFINITION_"+strings.ToUpper(params.Decision), req.ID, "Reviewed canonical role: "+req.RoleName, req.ID)

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	return &req, canonicalRole, nil
}
