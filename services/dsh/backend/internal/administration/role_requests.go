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
	ExecutionStatus     string     `json:"executionStatus"`
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
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return nil, contextErr
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
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var req RoleDefinitionRequest
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_role_definition_requests
			(operator_context_id, role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
		RETURNING id, role_name, description, active, expected_role_version, permissions, surfaces, requested_by, reason, status, version, created_at, updated_at
	`, operatorContextID, params.RoleName, params.Description, params.Active, expectedRoleVersion, permissionsJSON, surfacesJSON, actorID, params.Reason).Scan(
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

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, $2, 'ROLE_DEFINITION_REQUESTED', $3,
		        jsonb_build_object('request_id', $3::text, 'reason_provided', TRUE,
		                           'permission_count', $4::int, 'surface_count', $5::int)::text,
		        'restricted', $3)
	`, operatorContextID, actorID, req.ID, len(req.Permissions), len(req.Surfaces)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	req.ExecutionStatus = "not_started"

	return &req, nil
}

func ListRoleDefinitionRequests(ctx context.Context, db *sql.DB, status string) ([]RoleDefinitionRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	operatorContextID, err := requireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT request.id, request.role_name, request.description, request.active,
		       request.expected_role_version, request.permissions, request.surfaces,
		       request.requested_by, request.reason, request.status,
		       CASE
		         WHEN intent.id IS NULL THEN 'not_started'
		         WHEN intent.status = 'pending' AND intent.lease_owner IS NOT NULL THEN 'reconciling'
		         ELSE intent.status
		       END,
		       request.reviewed_by, request.review_note, request.version,
		       request.created_at, request.updated_at, request.reviewed_at
		FROM dsh_admin_role_definition_requests request
		LEFT JOIN dsh_admin_canonical_mutation_intents intent
		  ON intent.operation_type = 'role-definition-upsert' AND intent.request_id = request.id
		 AND intent.operator_context_id = request.operator_context_id
	`
	query += ` WHERE request.operator_context_id = $1 `
	args := []interface{}{operatorContextID}
	if status != "" {
		query += ` AND request.status = $2 `
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
			&req.ID, &req.RoleName, &req.Description, &req.Active, &req.ExpectedRoleVersion, &permissionsJSON, &surfacesJSON, &req.RequestedBy, &req.Reason, &req.Status, &req.ExecutionStatus,
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

func getRoleDefinitionRequest(ctx context.Context, db *sql.DB, operatorContextID, requestID string) (*RoleDefinitionRequest, error) {
	var req RoleDefinitionRequest
	var permissionsJSON, surfacesJSON []byte
	if err := db.QueryRowContext(ctx, `
		SELECT request.id, request.role_name, request.description, request.active,
		       request.expected_role_version, request.permissions, request.surfaces,
		       request.requested_by, request.reason, request.status,
		       CASE
		         WHEN intent.id IS NULL THEN 'not_started'
		         WHEN intent.status = 'pending' AND intent.lease_owner IS NOT NULL THEN 'reconciling'
		         ELSE intent.status
		       END,
		       request.reviewed_by, request.review_note, request.version,
		       request.created_at, request.updated_at, request.reviewed_at
		FROM dsh_admin_role_definition_requests request
		LEFT JOIN dsh_admin_canonical_mutation_intents intent
		  ON intent.operation_type = 'role-definition-upsert' AND intent.request_id = request.id
		 AND intent.operator_context_id = request.operator_context_id
		WHERE request.operator_context_id = $1 AND request.id = $2
	`, operatorContextID, requestID).Scan(
		&req.ID, &req.RoleName, &req.Description, &req.Active, &req.ExpectedRoleVersion, &permissionsJSON, &surfacesJSON,
		&req.RequestedBy, &req.Reason, &req.Status, &req.ExecutionStatus, &req.ReviewedBy, &req.ReviewNote, &req.Version,
		&req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := json.Unmarshal(permissionsJSON, &req.Permissions); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(surfacesJSON, &req.Surfaces); err != nil {
		return nil, err
	}
	return &req, nil
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
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return nil, nil, contextErr
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
		WHERE operator_context_id = $1 AND id = $2 FOR UPDATE
	`, operatorContextID, requestID).Scan(
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
			"operatorContextId": operatorContextID,
			"roleName":          req.RoleName,
			"description":       req.Description,
			"active":            req.Active,
			"expectedVersion":   req.ExpectedRoleVersion,
			"permissions":       permissions,
			"reviewerId":        actorID,
			"reviewNote":        params.ReviewNote,
		})
		if err := enqueueCanonicalMutationTx(ctx, tx, operatorContextID, "role-definition-upsert", req.ID, string(intentPayload)); err != nil {
			return nil, nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, nil, err
		}

		result, err := executeCanonicalMutationNow(ctx, db, identityClient, "role-definition-upsert", req.ID)
		if err != nil {
			return nil, nil, err
		}
		definition := result.roleDefinition
		if definition == nil {
			if identityClient == nil {
				return nil, nil, ErrIdentityUnavailable
			}
			readback, readErr := identityClient.GetRoleDefinition(ctx, req.RoleName)
			if readErr != nil {
				return nil, nil, ErrIdentityUnavailable
			}
			definition = &readback
		}
		role := roleFromCanonical(*definition)
		canonicalRole = &role
		requestReadback, readErr := getRoleDefinitionRequest(ctx, db, operatorContextID, req.ID)
		if readErr != nil {
			return nil, nil, readErr
		}
		if requestReadback.Status != "approved" || requestReadback.ReviewedBy == nil || *requestReadback.ReviewedBy != actorID {
			return nil, nil, errors.New("version conflict")
		}
		req = *requestReadback
	} else {
		if err = tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_role_definition_requests
			SET status = 'rejected', reviewed_by = $1, review_note = $2, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE operator_context_id = $3 AND id = $4 AND status = 'pending' AND version = $5
			RETURNING version, updated_at, reviewed_at
		`, actorID, params.ReviewNote, operatorContextID, requestID, req.Version).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt); err != nil {
			return nil, nil, errors.New("version conflict")
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, $2, 'ROLE_DEFINITION_REJECTED', $3,
			        jsonb_build_object('request_id', $3::text, 'decision', 'rejected',
			                           'note_provided', btrim($4::text) <> '',
			                           'permission_count', $5::int, 'surface_count', $6::int)::text,
			        'restricted', $3)
		`, operatorContextID, actorID, req.ID, params.ReviewNote, len(req.Permissions), len(req.Surfaces)); err != nil {
			return nil, nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, nil, err
		}
		req.Status = "rejected"
		req.ExecutionStatus = "not_started"
	}
	reviewer := actorID
	req.ReviewedBy = &reviewer
	req.ReviewNote = &params.ReviewNote
	return &req, canonicalRole, nil
}
