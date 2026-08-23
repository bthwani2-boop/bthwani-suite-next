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
	ID                  string     `json:"id"`
	RoleName            string     `json:"roleName"`
	Description         string     `json:"description"`
	Active              bool       `json:"active"`
	ExpectedRoleVersion int        `json:"expectedRoleVersion"`
	Permissions         []string   `json:"permissions"`
	Surfaces            []string   `json:"surfaces,omitempty"`
	RequestedBy         string     `json:"requestedBy"`
	Reason              string     `json:"reason"`
	Status              string     `json:"status"`
	ReviewedBy          *string    `json:"reviewedBy,omitempty"`
	ReviewNote          *string    `json:"reviewNote,omitempty"`
	Version             int        `json:"version"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           time.Time  `json:"updatedAt"`
	ReviewedAt          *time.Time `json:"reviewedAt,omitempty"`
}

type CreateRoleDefinitionParams struct {
	RoleName    string   `json:"name"`
	Description string   `json:"description"`
	Active      bool     `json:"active"`
	Permissions []string `json:"permissions"`
	Reason      string   `json:"reason"`
}

func normalizeAdministrationRoleSurfaces() []string {
	return []string{"control-panel"}
}

func canonicalPermissionsForRoleRequest(ctx context.Context, identityClient *auth.Client, actions []string) ([]auth.Permission, []string, error) {
	if identityClient == nil {
		return nil, nil, ErrIdentityUnavailable
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
			Scope:   "all",
		})
	}
	return permissions, normalizedActions, nil
}

func permissionKey(permission auth.Permission) string {
	return strings.Join([]string{permission.Service, permission.Surface, permission.Action, permission.Scope}, "\x1f")
}

func roleDefinitionMatchesRequest(definition auth.RbacRoleDefinition, req RoleDefinitionRequest, expected []auth.Permission) bool {
	if definition.Name != req.RoleName || definition.Description != req.Description || definition.Active != req.Active || len(definition.Permissions) != len(expected) {
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
	// The public request contract defaults new definitions to active. An
	// explicit false is preserved by the caller and is used for deactivation.
	if len(params.RoleName) < 3 || len(params.RoleName) > 80 {
		return nil, errors.New("invalid role name length")
	}
	if params.Description == "" {
		return nil, ErrInvalid
	}
	if len(strings.TrimSpace(params.Reason)) < 5 {
		return nil, errors.New("reason too short")
	}

	_, normalizedActions, err := canonicalPermissionsForRoleRequest(ctx, identityClient, params.Permissions)
	if err != nil {
		return nil, err
	}
	params.Permissions = normalizedActions
	expectedRoleVersion := 0
	if definition, getErr := identityClient.GetRoleDefinition(ctx, params.RoleName); getErr == nil {
		expectedRoleVersion = definition.Version
	} else if !errors.Is(getErr, auth.ErrRbacRoleNotFound) {
		return nil, ErrIdentityUnavailable
	}
	surfaces := normalizeAdministrationRoleSurfaces()

	permissionsJSON, err := json.Marshal(params.Permissions)
	if err != nil {
		return nil, err
	}
	surfacesJSON, err := json.Marshal(surfaces)
	if err != nil {
		return nil, err
	}

	var req RoleDefinitionRequest
	err = db.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_role_definition_requests
			(role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
		RETURNING id, role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason, status, version, created_at, updated_at
	`, params.RoleName, params.Description, params.Active, expectedRoleVersion, permissionsJSON, surfacesJSON, actorID, params.Reason).Scan(
		&req.ID, &req.RoleName, &req.Description, &req.Active, &req.ExpectedRoleVersion, &permissionsJSON, &surfacesJSON,
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
		SELECT id, role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason, status,
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
			&req.ID, &req.RoleName, &req.Description, &req.Active, &req.ExpectedRoleVersion, &permissionsJSON, &surfacesJSON, &req.RequestedBy, &req.Reason, &req.Status,
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
// after that exact readback matches. DSH never writes a local role registry.
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
		SELECT id, role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason, status, version
		FROM dsh_admin_role_definition_requests
		WHERE id = $1 FOR UPDATE
	`, requestID).Scan(
		&req.ID, &req.RoleName, &req.Description, &req.Active, &req.ExpectedRoleVersion, &permissionsJSON, &surfacesJSON, &req.RequestedBy, &req.Reason, &req.Status, &req.Version,
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
		permissions, normalizedActions, err := canonicalPermissionsForRoleRequest(ctx, identityClient, req.Permissions)
		if err != nil {
			return nil, nil, err
		}
		req.Permissions = normalizedActions
		req.Surfaces = normalizeAdministrationRoleSurfaces()
		intentPayload, _ := json.Marshal(map[string]any{
			"roleName": req.RoleName,
			"description": req.Description,
			"active": req.Active,
			"expectedVersion": req.ExpectedRoleVersion,
			"permissions": permissions,
			"reviewerId": actorID,
			"reviewNote": params.ReviewNote,
		})
		if err := enqueueCanonicalMutationTx(ctx, tx, "role-definition-upsert", req.ID, string(intentPayload)); err != nil {
			return nil, nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, nil, err
		}

		if identityClient == nil {
			_ = markCanonicalMutation(ctx, db, "role-definition-upsert", req.ID, "failed", "identity client is unavailable")
			return nil, nil, ErrIdentityUnavailable
		}
		readback, err := identityClient.UpsertRoleDefinition(ctx, req.RoleName, req.Description, req.Active, req.ExpectedRoleVersion, permissions, req.ID)
		if err != nil {
			_ = markCanonicalMutation(ctx, db, "role-definition-upsert", req.ID, "failed", err.Error())
			if errors.Is(err, auth.ErrIdentityUnavailable) {
				return nil, nil, ErrIdentityUnavailable
			}
			return nil, nil, ErrCanonicalMutationFailed
		}
		if !roleDefinitionMatchesRequest(readback, req, permissions) {
			_ = markCanonicalMutation(ctx, db, "role-definition-upsert", req.ID, "failed", "canonical readback mismatch")
			return nil, nil, ErrCanonicalMutationFailed
		}
		role := roleFromCanonical(readback)
		canonicalRole = &role

		finalize, finalizeErr := db.BeginTx(ctx, nil)
		if finalizeErr != nil {
			return nil, nil, finalizeErr
		}
		defer finalize.Rollback()
		if err := finalize.QueryRowContext(ctx, `
			UPDATE dsh_admin_role_definition_requests
			SET status = 'approved', reviewed_by = $1, review_note = $2, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version, updated_at, reviewed_at
		`, actorID, params.ReviewNote, requestID, req.Version).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt); err != nil {
			return nil, nil, errors.New("version conflict")
		}
		intentResult, err := finalize.ExecContext(ctx, `
			UPDATE dsh_admin_canonical_mutation_intents
			SET status = 'applied', attempts = attempts + 1, last_error = NULL,
			    next_attempt_at = NULL, terminal_failure = FALSE,
			    lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW()
			WHERE operation_type = 'role-definition-upsert' AND request_id = $1
		`, req.ID)
		if err != nil {
			return nil, nil, err
		}
		if rows, rowsErr := intentResult.RowsAffected(); rowsErr != nil || rows != 1 {
			if rowsErr != nil {
				return nil, nil, rowsErr
			}
			return nil, nil, errors.New("canonical mutation intent is missing")
		}
		_, _ = finalize.ExecContext(ctx, `INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id) VALUES ($1, $2, $3, $4, 'HIGH', $5)`, actorID, "ROLE_DEFINITION_APPROVED", req.ID, "Reviewed canonical role: "+req.RoleName, req.ID)
		if err := finalize.Commit(); err != nil {
			return nil, nil, err
		}
		req.Status = "approved"
	} else {
		if err = tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_role_definition_requests
			SET status = 'rejected', reviewed_by = $1, review_note = $2, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version, updated_at, reviewed_at
		`, actorID, params.ReviewNote, requestID, req.Version).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt); err != nil {
			return nil, nil, errors.New("version conflict")
		}
		_, _ = tx.ExecContext(ctx, `INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id) VALUES ($1, $2, $3, $4, 'HIGH', $5)`, actorID, "ROLE_DEFINITION_REJECTED", req.ID, "Reviewed canonical role: "+req.RoleName, req.ID)
		if err := tx.Commit(); err != nil {
			return nil, nil, err
		}
		req.Status = "rejected"
	}
	reviewer := actorID
	req.ReviewedBy = &reviewer
	req.ReviewNote = &params.ReviewNote
	return &req, canonicalRole, nil
}
