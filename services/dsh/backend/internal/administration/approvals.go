package administration

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"dsh-api/internal/auth"
)

type RoleAssignmentApproval struct {
	ID            string     `json:"id"`
	ActionType    string     `json:"actionType"`
	TargetActorID string     `json:"targetActorId"`
	RoleID        string     `json:"roleId"`
	RequestedBy   string     `json:"requestedBy"`
	Reason        string     `json:"reason"`
	Status        string     `json:"status"`
	ReviewedBy    *string    `json:"reviewedBy,omitempty"`
	ReviewNote    *string    `json:"reviewNote,omitempty"`
	Version       int        `json:"version"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	ReviewedAt    *time.Time `json:"reviewedAt,omitempty"`
}

type CreateRoleAssignmentParams struct {
	RoleID     string `json:"roleId"`
	ActionType string `json:"actionType"`
	Reason     string `json:"reason"`
}

func CreateRoleAssignmentApproval(ctx context.Context, db *sql.DB, actorID, targetActorID string, params CreateRoleAssignmentParams) (*RoleAssignmentApproval, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if params.ActionType != "staff_role_assignment" {
		return nil, errors.New("invalid action type")
	}
	if len(strings.TrimSpace(params.Reason)) < 5 {
		return nil, errors.New("reason too short")
	}
	if actorID == targetActorID {
		return nil, errors.New("cannot request role assignment for yourself")
	}

	var req RoleAssignmentApproval
	err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_approval_requests
			(action_type, target_actor_id, role_id, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, action_type, target_actor_id, role_id, requested_by, reason, status, version, created_at, updated_at
	`, params.ActionType, targetActorID, params.RoleID, actorID, params.Reason).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleID,
		&req.RequestedBy, &req.Reason, &req.Status, &req.Version, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	_, _ = db.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLE_ASSIGNMENT_REQUESTED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Requested role assignment for: "+targetActorID, req.ID)

	return &req, nil
}

func ListRoleAssignmentApprovals(ctx context.Context, db *sql.DB, status string) ([]RoleAssignmentApproval, error) {
	if db == nil {
		return nil, ErrInvalid
	}

	query := `
		SELECT id, action_type, target_actor_id, role_id, requested_by, reason, status,
		       reviewed_by, review_note, version, created_at, updated_at, reviewed_at
		FROM dsh_admin_approval_requests
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

	out := make([]RoleAssignmentApproval, 0)
	for rows.Next() {
		var req RoleAssignmentApproval
		if err := rows.Scan(
			&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleID, &req.RequestedBy, &req.Reason, &req.Status,
			&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

// ReviewRoleAssignmentApproval reviews a pending staff-role-assignment
// approval. On approval, Identity's GrantRole is the canonical mutation:
// it must succeed before this approval's status may flip to approved. A
// failed or unreachable Identity call leaves the approval pending — DSH
// never marks an assignment approved without the canonical grant applied.
func ReviewRoleAssignmentApproval(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID string, approvalID string, params ReviewDecisionParams) (*RoleAssignmentApproval, *auth.RbacActorRoleAssignment, error) {
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

	var req RoleAssignmentApproval
	err = tx.QueryRowContext(ctx, `
		SELECT id, action_type, target_actor_id, role_id, requested_by, reason, status, version
		FROM dsh_admin_approval_requests
		WHERE id = $1 FOR UPDATE
	`, approvalID).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleID, &req.RequestedBy, &req.Reason, &req.Status, &req.Version,
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

	var assignment *auth.RbacActorRoleAssignment
	if params.Decision == "approved" {
		if req.ActionType != "staff_role_assignment" {
			return nil, nil, errors.New("unsupported action type")
		}
		if identityClient == nil {
			return nil, nil, ErrIdentityUnavailable
		}
		var roleName string
		if scanErr := tx.QueryRowContext(ctx, `SELECT name FROM dsh_admin_roles WHERE id = $1`, req.RoleID).Scan(&roleName); scanErr != nil {
			if scanErr == sql.ErrNoRows {
				return nil, nil, ErrNotFound
			}
			return nil, nil, scanErr
		}
		granted, grantErr := identityClient.GrantRole(ctx, req.TargetActorID, roleName, actorID)
		if grantErr != nil {
			return nil, nil, ErrCanonicalMutationFailed
		}
		assignment = &granted
	}

	// Update status — only after the canonical grant (if any) succeeded.
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_approval_requests
		SET status = $1, reviewed_by = $2, review_note = $3, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
		WHERE id = $4
		RETURNING version, updated_at, reviewed_at
	`, params.Decision, actorID, params.ReviewNote, approvalID).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt)
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
	`, actorID, "ROLE_ASSIGNMENT_"+strings.ToUpper(params.Decision), req.ID, "Reviewed role assignment for: "+req.TargetActorID, req.ID)

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	return &req, assignment, nil
}
