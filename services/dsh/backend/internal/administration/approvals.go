package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"dsh-api/internal/auth"
	"github.com/lib/pq"
)

type RoleAssignmentApproval struct {
	ID                  string     `json:"id"`
	ActionType          string     `json:"actionType"`
	TargetActorID       string     `json:"targetActorId"`
	RoleName            string     `json:"roleName"`
	ExpectedRoleVersion int        `json:"-"`
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

type CreateRoleAssignmentParams struct {
	RoleName   string `json:"roleName"`
	ActionType string `json:"actionType"`
	Reason     string `json:"reason"`
}

func validateRoleReviewSeparation(requestedBy, targetActorID, reviewerID string) error {
	if requestedBy == reviewerID {
		return separationOfDutiesError("cannot review own request")
	}
	if targetActorID == reviewerID {
		return separationOfDutiesError("beneficiary cannot review role change")
	}
	if requestedBy == targetActorID {
		return separationOfDutiesError("maker and beneficiary must be distinct")
	}
	return nil
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
	definition, err := identityClient.GetRoleDefinition(ctx, params.RoleName)
	if err != nil {
		if errors.Is(err, auth.ErrRbacRoleNotFound) {
			return nil, ErrNotFound
		}
		return nil, ErrIdentityUnavailable
	}
	var pending bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM dsh_admin_approval_requests
			WHERE target_actor_id = $1 AND role_name = $2 AND status = 'pending'
		)`, targetActorID, params.RoleName).Scan(&pending); err != nil {
		return nil, err
	}
	if pending {
		return nil, ErrConflict
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var req RoleAssignmentApproval
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_approval_requests
			(action_type, target_actor_id, role_name, expected_role_version, requested_by, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		RETURNING id, action_type, target_actor_id, role_name, expected_role_version, requested_by, reason, status, version, created_at, updated_at
	`, params.ActionType, targetActorID, params.RoleName, definition.Version, actorID, params.Reason).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName,
		&req.ExpectedRoleVersion, &req.RequestedBy, &req.Reason, &req.Status, &req.Version, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" && pqErr.Constraint == "uq_dsh_admin_pending_role_change_by_actor_role" {
			return nil, ErrConflict
		}
		return nil, err
	}
	req.ExecutionStatus = "not_started"

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
		VALUES ($1, 'ROLE_ASSIGNMENT_REQUESTED', $2,
		        jsonb_build_object('request_id', $2::text, 'action_type', $3::text, 'reason_provided', TRUE)::text,
		        'restricted', $2)
	`, actorID, req.ID, params.ActionType); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return &req, nil
}

func ListRoleAssignmentApprovals(ctx context.Context, db *sql.DB, status string) ([]RoleAssignmentApproval, error) {
	if db == nil {
		return nil, ErrInvalid
	}

	query := `
		SELECT request.id, request.action_type, request.target_actor_id, request.role_name, COALESCE(request.expected_role_version, 0),
		       request.requested_by, request.reason, request.status,
		       CASE
		         WHEN intent.id IS NULL THEN 'not_started'
		         WHEN intent.status = 'pending' AND intent.lease_owner IS NOT NULL THEN 'reconciling'
		         ELSE intent.status
		       END,
		       request.reviewed_by, request.review_note, request.version,
		       request.created_at, request.updated_at, request.reviewed_at
		FROM dsh_admin_approval_requests request
		LEFT JOIN dsh_admin_canonical_mutation_intents intent
		  ON intent.operation_type = 'role-assignment' AND intent.request_id = request.id
	`
	args := []interface{}{}
	if status != "" {
		query += ` WHERE request.status = $1 `
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
			&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName, &req.ExpectedRoleVersion, &req.RequestedBy, &req.Reason, &req.Status, &req.ExecutionStatus,
			&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, req)
	}
	return out, rows.Err()
}

func getRoleAssignmentApproval(ctx context.Context, db *sql.DB, approvalID string) (*RoleAssignmentApproval, error) {
	var req RoleAssignmentApproval
	if err := db.QueryRowContext(ctx, `
		SELECT request.id, request.action_type, request.target_actor_id, request.role_name, COALESCE(request.expected_role_version, 0),
		       request.requested_by, request.reason, request.status,
		       CASE
		         WHEN intent.id IS NULL THEN 'not_started'
		         WHEN intent.status = 'pending' AND intent.lease_owner IS NOT NULL THEN 'reconciling'
		         ELSE intent.status
		       END,
		       request.reviewed_by, request.review_note, request.version,
		       request.created_at, request.updated_at, request.reviewed_at
		FROM dsh_admin_approval_requests request
		LEFT JOIN dsh_admin_canonical_mutation_intents intent
		  ON intent.operation_type = 'role-assignment' AND intent.request_id = request.id
		WHERE request.id = $1
	`, approvalID).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName, &req.ExpectedRoleVersion, &req.RequestedBy, &req.Reason, &req.Status, &req.ExecutionStatus,
		&req.ReviewedBy, &req.ReviewNote, &req.Version, &req.CreatedAt, &req.UpdatedAt, &req.ReviewedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &req, nil
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
		SELECT id, action_type, target_actor_id, role_name, COALESCE(expected_role_version, 0), requested_by, reason, status, version
		FROM dsh_admin_approval_requests
		WHERE id = $1 FOR UPDATE
	`, approvalID).Scan(
		&req.ID, &req.ActionType, &req.TargetActorID, &req.RoleName, &req.ExpectedRoleVersion, &req.RequestedBy, &req.Reason, &req.Status, &req.Version,
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
	if err := validateRoleReviewSeparation(req.RequestedBy, req.TargetActorID, actorID); err != nil {
		return nil, nil, err
	}

	if params.Decision == "rejected" {
		if err = tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_approval_requests
			SET status = 'rejected', reviewed_by = $1, review_note = $2, version = version + 1, updated_at = NOW(), reviewed_at = NOW()
			WHERE id = $3 AND status = 'pending' AND version = $4
			RETURNING version, updated_at, reviewed_at
		`, actorID, params.ReviewNote, approvalID, req.Version).Scan(&req.Version, &req.UpdatedAt, &req.ReviewedAt); err != nil {
			return nil, nil, errors.New("version conflict")
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, 'ROLE_ASSIGNMENT_REJECTED', $2,
			        jsonb_build_object('request_id', $2::text, 'decision', 'rejected',
			                           'action_type', $3::text, 'note_provided', btrim($4::text) <> '')::text,
			        'restricted', $2)
		`, actorID, req.ID, req.ActionType, params.ReviewNote); err != nil {
			return nil, nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, nil, err
		}
		req.Status = "rejected"
		req.ExecutionStatus = "not_started"
		reviewer := actorID
		req.ReviewedBy = &reviewer
		req.ReviewNote = &params.ReviewNote
		return &req, nil, nil
	}

	intentPayload, _ := json.Marshal(roleMutationIntentPayload{
		TargetActorID:       req.TargetActorID,
		RoleName:            req.RoleName,
		ExpectedRoleVersion: req.ExpectedRoleVersion,
		ActionType:          req.ActionType,
		ReviewerID:          actorID,
		ReviewNote:          params.ReviewNote,
	})
	if err := enqueueCanonicalMutationTx(ctx, tx, "role-assignment", req.ID, string(intentPayload)); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	result, err := executeCanonicalMutationNow(ctx, db, identityClient, "role-assignment", req.ID)
	if err != nil {
		return nil, nil, err
	}
	readback, err := getRoleAssignmentApproval(ctx, db, req.ID)
	if err != nil {
		return nil, nil, err
	}
	if readback.Status != "approved" || readback.ReviewedBy == nil || *readback.ReviewedBy != actorID {
		return nil, nil, errors.New("version conflict")
	}
	return readback, result.assignment, nil
}
