package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"dsh-api/internal/auth"
)

type RollbackRequest struct {
	ID                string     `json:"id"`
	SourceApprovalID  string     `json:"sourceApprovalId"`
	SourceActionType  string     `json:"sourceActionType"`
	InverseActionType string     `json:"inverseActionType"`
	TargetActorID     string     `json:"targetActorId"`
	RoleName          string     `json:"roleName"`
	RequestedBy       string     `json:"requestedBy"`
	Reason            string     `json:"reason"`
	Status            string     `json:"status"`
	ReviewedBy        *string    `json:"reviewedBy,omitempty"`
	ReviewNote        *string    `json:"reviewNote,omitempty"`
	Version           int        `json:"version"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	ReviewedAt        *time.Time `json:"reviewedAt,omitempty"`
	SourceApprovedBy  string     `json:"sourceApprovedBy"`
}

type CreateRollbackRequestParams struct {
	Reason string `json:"reason"`
}

func validateRollbackReviewSeparation(requestedBy, targetActorID, sourceApprovedBy, reviewerID string) error {
	if err := validateRoleReviewSeparation(requestedBy, targetActorID, reviewerID); err != nil {
		return err
	}
	if sourceApprovedBy != "" && sourceApprovedBy == reviewerID {
		return errors.New("original approval checker cannot review rollback")
	}
	return nil
}

func inverseRoleAction(actionType string) (string, error) {
	switch actionType {
	case "staff_role_assignment":
		return "staff_role_revocation", nil
	case "staff_role_revocation":
		return "staff_role_assignment", nil
	default:
		return "", errors.New("unsupported action type")
	}
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

	var actionType, targetActor, roleName, status, sourceApprovedBy string
	err = tx.QueryRowContext(ctx, `
		SELECT action_type, target_actor_id, role_name, status, COALESCE(reviewed_by, '')
		FROM dsh_admin_approval_requests
		WHERE id = $1
	`, approvalID).Scan(&actionType, &targetActor, &roleName, &status, &sourceApprovedBy)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
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
	inverseAction, err := inverseRoleAction(actionType)
	if err != nil {
		return nil, err
	}

	var req RollbackRequest
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_rollback_requests
			(source_approval_id, inverse_action_type, target_actor_id, role_name, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		RETURNING id, source_approval_id, inverse_action_type, target_actor_id, role_name, requested_by, reason, status, version, created_at, updated_at
	`, approvalID, inverseAction, targetActor, roleName, actorID, params.Reason).Scan(
		&req.ID, &req.SourceApprovalID, &req.InverseActionType, &req.TargetActorID, &req.RoleName,
		&req.RequestedBy, &req.Reason, &req.Status, &req.Version, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	req.SourceActionType = actionType
	req.SourceApprovedBy = sourceApprovedBy

	_, _ = tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLLBACK_REQUESTED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Requested rollback for approval "+approvalID+" and role "+roleName, req.ID)

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
		SELECT rollback.id, rollback.source_approval_id, source.action_type,
		       rollback.inverse_action_type, rollback.target_actor_id, rollback.role_name,
		       rollback.requested_by, rollback.reason, rollback.status,
		       rollback.reviewed_by, rollback.review_note, rollback.version,
		       rollback.created_at, rollback.updated_at, rollback.reviewed_at,
		       COALESCE(source.reviewed_by, '')
		FROM dsh_admin_rollback_requests rollback
		JOIN dsh_admin_approval_requests source ON source.id = rollback.source_approval_id
	`
	args := []interface{}{}
	if status != "" {
		query += ` WHERE rollback.status = $1 `
		args = append(args, status)
	}
	query += ` ORDER BY rollback.created_at DESC`

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]RollbackRequest, 0)
	for rows.Next() {
		var req RollbackRequest
		if err := rows.Scan(
			&req.ID, &req.SourceApprovalID, &req.SourceActionType, &req.InverseActionType,
			&req.TargetActorID, &req.RoleName, &req.RequestedBy, &req.Reason, &req.Status,
			&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt,
			&req.ReviewedAt, &req.SourceApprovedBy,
		); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

// ReviewRollbackRequest applies the exact inverse of an approved governed role
// change through Identity. DSH records approval only after the canonical inverse
// mutation succeeds.
func ReviewRollbackRequest(ctx context.Context, db *sql.DB, identityClient *auth.Client, actorID string, requestID string, params ReviewDecisionParams) (*RollbackRequest, error) {
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
		SELECT rollback.id, rollback.source_approval_id, source.action_type,
		       rollback.inverse_action_type, rollback.target_actor_id, rollback.role_name,
		       rollback.requested_by, rollback.reason, rollback.status, rollback.version,
		       COALESCE(source.reviewed_by, '')
		FROM dsh_admin_rollback_requests rollback
		JOIN dsh_admin_approval_requests source ON source.id = rollback.source_approval_id
		WHERE rollback.id = $1 FOR UPDATE OF rollback
	`, requestID).Scan(
		&req.ID, &req.SourceApprovalID, &req.SourceActionType, &req.InverseActionType,
		&req.TargetActorID, &req.RoleName, &req.RequestedBy, &req.Reason,
		&req.Status, &req.Version, &req.SourceApprovedBy,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
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
	if err := validateRollbackReviewSeparation(req.RequestedBy, req.TargetActorID, req.SourceApprovedBy, actorID); err != nil {
		return nil, err
	}

	if params.Decision == "rejected" {
		if err = tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_rollback_requests
			SET status = 'rejected', reviewed_by = $1, review_note = $2, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version, updated_at, reviewed_at
		`, actorID, params.ReviewNote, requestID, req.Version).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt); err != nil {
			return nil, errors.New("version conflict")
		}
		_, _ = tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, 'ROLLBACK_REJECTED', $2, $3, 'HIGH', $4)
		`, actorID, req.ID, "Reviewed rollback for role "+req.RoleName+" and actor "+req.TargetActorID, req.ID)
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		req.Status = "rejected"
		reviewer := actorID
		req.ReviewedBy = &reviewer
		req.ReviewNote = &params.ReviewNote
		return &req, nil
	}

	intentPayload, _ := json.Marshal(map[string]string{
		"targetActorId": req.TargetActorID,
		"roleName": req.RoleName,
		"actionType": req.InverseActionType,
		"reviewerId": actorID,
		"reviewNote": params.ReviewNote,
	})
	if err := enqueueCanonicalMutationTx(ctx, tx, "role-rollback", req.ID, string(intentPayload)); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	if identityClient == nil {
		_ = markCanonicalMutation(ctx, db, "role-rollback", req.ID, "failed", "identity client is unavailable")
		return nil, ErrIdentityUnavailable
	}
	switch req.InverseActionType {
	case "staff_role_revocation":
		if revokeErr := identityClient.RevokeRoleWithIdempotency(ctx, req.TargetActorID, req.RoleName, actorID, req.ID); revokeErr != nil {
			_ = markCanonicalMutation(ctx, db, "role-rollback", req.ID, "failed", revokeErr.Error())
			return nil, ErrCanonicalMutationFailed
		}
	case "staff_role_assignment":
		if _, grantErr := identityClient.GrantRoleWithIdempotency(ctx, req.TargetActorID, req.RoleName, actorID, req.ID); grantErr != nil {
			_ = markCanonicalMutation(ctx, db, "role-rollback", req.ID, "failed", grantErr.Error())
			return nil, ErrCanonicalMutationFailed
		}
	default:
		return nil, errors.New("unsupported inverse action type")
	}

	finalize, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer finalize.Rollback()
	if err := finalize.QueryRowContext(ctx, `
		UPDATE dsh_admin_rollback_requests
		SET status = 'approved', reviewed_by = $1, review_note = $2, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
		WHERE id = $3 AND status = 'pending' AND version = $4
		RETURNING version, updated_at, reviewed_at
	`, actorID, params.ReviewNote, requestID, req.Version).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt); err != nil {
		return nil, errors.New("version conflict")
	}
	intentResult, err := finalize.ExecContext(ctx, `
		UPDATE dsh_admin_canonical_mutation_intents
		SET status = 'applied', attempts = attempts + 1, last_error = NULL,
		    next_attempt_at = NULL, terminal_failure = FALSE,
		    lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW()
		WHERE operation_type = 'role-rollback' AND request_id = $1
	`, req.ID)
	if err != nil {
		return nil, err
	}
	if rows, rowsErr := intentResult.RowsAffected(); rowsErr != nil || rows != 1 {
		if rowsErr != nil {
			return nil, rowsErr
		}
		return nil, errors.New("canonical mutation intent is missing")
	}
	_, _ = finalize.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLLBACK_APPROVED', $2, $3, 'HIGH', $4)
	`, actorID, req.ID, "Reviewed rollback for role "+req.RoleName+" and actor "+req.TargetActorID, req.ID)
	if err := finalize.Commit(); err != nil {
		return nil, err
	}
	req.Status = "approved"
	reviewer := actorID
	req.ReviewedBy = &reviewer
	req.ReviewNote = &params.ReviewNote
	return &req, nil
}
