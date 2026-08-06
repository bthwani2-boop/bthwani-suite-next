package administration

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

type RollbackRequest struct {
	ID                string     `json:"id"`
	SourceApprovalID  string     `json:"sourceApprovalId"`
	InverseActionType string     `json:"inverseActionType"`
	TargetActorID     string     `json:"targetActorId"`
	RoleID            string     `json:"roleId"`
	RequestedBy       string     `json:"requestedBy"`
	Reason            string     `json:"reason"`
	Status            string     `json:"status"`
	ReviewedBy        *string    `json:"reviewedBy,omitempty"`
	ReviewNote        *string    `json:"reviewNote,omitempty"`
	Version           int        `json:"version"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	ReviewedAt        *time.Time `json:"reviewedAt,omitempty"`
}

type CreateRollbackRequestParams struct {
	Reason string `json:"reason"`
}

func CreateRollbackRequest(ctx context.Context, db *sql.DB, actorID string, approvalID string, params CreateRollbackRequestParams) (*RollbackRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if len(strings.TrimSpace(params.Reason)) < 5 {
		return nil, errors.New("reason too short")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Verify source approval
	var actionType, targetActor, roleID, status string
	err = tx.QueryRowContext(ctx, `
		SELECT action_type, target_actor_id, role_id, status 
		FROM dsh_admin_approval_requests 
		WHERE id = $1
	`, approvalID).Scan(&actionType, &targetActor, &roleID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if status != "approved" {
		return nil, errors.New("only approved requests can be rolled back")
	}
	if actorID == targetActor {
		return nil, errors.New("cannot request rollback for yourself")
	}

	inverseAction := "staff_role_revocation"
	if actionType != "staff_role_assignment" {
		inverseAction = "unknown"
	}

	var req RollbackRequest
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_rollback_requests 
			(source_approval_id, inverse_action_type, target_actor_id, role_id, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		RETURNING id, source_approval_id, inverse_action_type, target_actor_id, role_id, requested_by, reason, status, version, created_at, updated_at
	`, approvalID, inverseAction, targetActor, roleID, actorID, params.Reason).Scan(
		&req.ID, &req.SourceApprovalID, &req.InverseActionType, &req.TargetActorID, &req.RoleID,
		&req.RequestedBy, &req.Reason, &req.Status, &req.Version, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	_, _ = tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLLBACK_REQUESTED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Requested rollback for approval: "+approvalID, req.ID)

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &req, nil
}

func ListRollbackRequests(ctx context.Context, db *sql.DB, status string) ([]RollbackRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	
	query := `
		SELECT id, source_approval_id, inverse_action_type, target_actor_id, role_id, requested_by, reason, status, 
		       reviewed_by, review_note, version, created_at, updated_at, reviewed_at
		FROM dsh_admin_rollback_requests
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

	out := make([]RollbackRequest, 0)
	for rows.Next() {
		var req RollbackRequest
		if err := rows.Scan(
			&req.ID, &req.SourceApprovalID, &req.InverseActionType, &req.TargetActorID, &req.RoleID, &req.RequestedBy, &req.Reason, &req.Status,
			&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

func ReviewRollbackRequest(ctx context.Context, db *sql.DB, actorID string, requestID string, params ReviewDecisionParams) (*RollbackRequest, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if params.Decision != "approved" && params.Decision != "rejected" {
		return nil, errors.New("invalid decision")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var req RollbackRequest
	err = tx.QueryRowContext(ctx, `
		SELECT id, source_approval_id, inverse_action_type, target_actor_id, role_id, requested_by, reason, status, version
		FROM dsh_admin_rollback_requests
		WHERE id = $1 FOR UPDATE
	`, requestID).Scan(
		&req.ID, &req.SourceApprovalID, &req.InverseActionType, &req.TargetActorID, &req.RoleID, &req.RequestedBy, &req.Reason, &req.Status, &req.Version,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if req.Status != "pending" {
		return nil, errors.New("request is not pending")
	}
	if req.Version != params.ExpectedVersion {
		return nil, errors.New("version conflict")
	}
	if req.RequestedBy == actorID {
		return nil, errors.New("cannot review own request")
	}

	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_rollback_requests
		SET status = $1, reviewed_by = $2, review_note = $3, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
		WHERE id = $4
		RETURNING version, updated_at, reviewed_at
	`, params.Decision, actorID, params.ReviewNote, requestID).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt)
	if err != nil {
		return nil, err
	}

	req.Status = params.Decision
	reviewer := actorID
	req.ReviewedBy = &reviewer
	req.ReviewNote = &params.ReviewNote

	_, _ = tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, $2, $3, $4, 'HIGH', $5)
	`, actorID, "ROLLBACK_"+strings.ToUpper(params.Decision), req.ID, "Reviewed rollback request for: "+req.TargetActorID, req.ID)

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &req, nil
}
