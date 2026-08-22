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
	RoleName      string     `json:"roleName"`
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
	RoleName   string `json:"roleName"`
	ActionType string `json:"actionType"`
	Reason     string `json:"reason"`
}

func CreateRoleAssignmentApproval(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID, targetActorID string, params CreateRoleAssignmentParams) (*RoleAssignmentApproval, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if params.ActionType != "staff_role_assignment" && params.ActionType != "staff_role_revocation" {
		return nil, errors.New("invalid action type")
	}
	params.RoleName = strings.TrimSpace(params.RoleName)
	if params.RoleName == "" {
		return nil, ErrInvalid
	}
	if len(strings.TrimSpace(params.Reason)) < 5 {
		return nil, errors.New("reason too short")
	}
	if actorID == targetActorID {
		return nil, errors.New("cannot request role assignment for yourself")
	}
	if identityClient == nil {
		return nil, ErrIdentityUnavailable
	}
	if _, err := identityClient.GetRoleDefinition(ctx, params.RoleName); err != nil {
		if errors.Is(err, auth.ErrRbacRoleNotFound) {
			return nil, ErrNotFound
		}
		return nil, ErrIdentityUnavailable
	}

	var req RoleAssignmentApproval
	err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_approval_requests
			(action_type, target_actor_id, role_name, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, action_type, target_actor_id, role_name, requested_by, reason, status, version, created_at, updated_at
	`, params.ActionType, targetActorID, params.RoleName, actorID, params.Reason).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName,
		&req.RequestedBy, &req.Reason, &req.Status, &req.Version, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	_, _ = db.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLE_ASSIGNMENT_REQUESTED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Requested "+params.ActionType+" for role "+req.RoleName+" and actor "+targetActorID, req.ID)

	return &req, nil
}

func ListRoleAssignmentApprovals(ctx context.Context, db *sql.DB, status string) ([]RoleAssignmentApproval, error) {
	if db == nil {
		return nil, ErrInvalid
	}

	query := `
		SELECT id, action_type, target_actor_id, role_name, requested_by, reason, status,
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
			&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName, &req.RequestedBy, &req.Reason, &req.Status,
			&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

// ReviewRoleAssignmentApproval reviews a pending canonical actor-role change.
// Identity is the only mutation authority. DSH changes the maker/checker status
// only after the requested Identity grant or revoke succeeds.
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
		SELECT id, action_type, target_actor_id, role_name, requested_by, reason, status, version
		FROM dsh_admin_approval_requests
		WHERE id = $1 FOR UPDATE
	`, approvalID).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName, &req.RequestedBy, &req.Reason, &req.Status, &req.Version,
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

	var assignment *auth.RbacActorRoleAssignment
	if params.Decision == "approved" {
		if identityClient == nil {
			return nil, nil, ErrIdentityUnavailable
		}
		switch req.ActionType {
		case "staff_role_assignment":
			granted, grantErr := identityClient.GrantRole(ctx, req.TargetActorID, req.RoleName, actorID)
			if grantErr != nil {
				return nil, nil, ErrCanonicalMutationFailed
			}
			assignment = &granted
		case "staff_role_revocation":
			if revokeErr := identityClient.RevokeRole(ctx, req.TargetActorID, req.RoleName, actorID); revokeErr != nil {
				return nil, nil, ErrCanonicalMutationFailed
			}
		default:
			return nil, nil, errors.New("unsupported action type")
		}
	}

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
	`, actorID, "ROLE_ASSIGNMENT_"+strings.ToUpper(params.Decision), req.ID, "Reviewed "+req.ActionType+" for role "+req.RoleName+" and actor "+req.TargetActorID, req.ID)

	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	return &req, assignment, nil
}
