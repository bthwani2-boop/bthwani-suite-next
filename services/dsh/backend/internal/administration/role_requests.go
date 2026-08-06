package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type RoleDefinitionRequest struct {
	ID          string     `json:"id"`
	RoleName    string     `json:"roleName"`
	Description string     `json:"description"`
	Permissions []string   `json:"permissions"`
	Surfaces    []string   `json:"surfaces,omitempty"` // added for frontend compatibility if missing in db
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

func CreateRoleDefinitionRequest(ctx context.Context, db *sql.DB, actorID string, params CreateRoleDefinitionParams) (*RoleDefinitionRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	params.RoleName = strings.TrimSpace(params.RoleName)
	if len(params.RoleName) < 3 || len(params.RoleName) > 80 {
		return nil, errors.New("invalid role name length")
	}
	if len(strings.TrimSpace(params.Reason)) < 5 {
		return nil, errors.New("reason too short")
	}

	permissionsJSON, _ := json.Marshal(params.Permissions)
	if params.Surfaces == nil {
		params.Surfaces = []string{"control-panel"}
	}
	surfacesJSON, _ := json.Marshal(params.Surfaces)

	var req RoleDefinitionRequest
	err := db.QueryRowContext(ctx, `
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
	_ = json.Unmarshal(permissionsJSON, &req.Permissions)
	_ = json.Unmarshal(surfacesJSON, &req.Surfaces)

	// Log audit
	_, _ = db.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLE_DEFINITION_REQUESTED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Requested new role: "+req.RoleName, req.ID)

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
		_ = json.Unmarshal(permissionsJSON, &req.Permissions)
		_ = json.Unmarshal(surfacesJSON, &req.Surfaces)
		out = append(out, req)
	}
	return out, rows.Err()
}

type ReviewDecisionParams struct {
	Decision        string `json:"decision"`
	ReviewNote      string `json:"reviewNote"`
	ExpectedVersion int    `json:"expectedVersion"`
}

func ReviewRoleDefinitionRequest(ctx context.Context, db *sql.DB, actorID string, requestID string, params ReviewDecisionParams) (*RoleDefinitionRequest, *Role, error) {
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
		if err == sql.ErrNoRows {
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

	// Update Request
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
	_ = json.Unmarshal(permissionsJSON, &req.Permissions)
	_ = json.Unmarshal(surfacesJSON, &req.Surfaces)

	var newRole *Role
	if params.Decision == "approved" {
		var role Role
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_admin_roles (name, description, permissions, surfaces, active)
			VALUES ($1, $2, $3, $4, true)
			RETURNING id, name, COALESCE(description,''), permissions, surfaces, active, version, created_at
		`, req.RoleName, req.Description, permissionsJSON, surfacesJSON).Scan(
			&role.ID, &role.Name, &role.Description, &permissionsJSON, &surfacesJSON,
			&role.Active, &role.Version, &role.CreatedAt,
		)
		if err != nil {
			return nil, nil, err
		}
		_ = json.Unmarshal(permissionsJSON, &role.Permissions)
		_ = json.Unmarshal(surfacesJSON, &role.Surfaces)
		newRole = &role
	}

	_, _ = tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, $2, $3, $4, 'HIGH', $5)
	`, actorID, "ROLE_DEFINITION_"+strings.ToUpper(params.Decision), req.ID, "Reviewed role: "+req.RoleName, req.ID)

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	return &req, newRole, nil
}
