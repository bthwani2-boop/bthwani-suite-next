package administration

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var (
	ErrApprovalConflict = errors.New("approval request conflict")
	ErrSelfApproval     = errors.New("maker and checker must be different actors")
)

type RoleAssignmentApproval struct {
	ID            string     `json:"id"`
	ActionType    string     `json:"actionType"`
	TargetActorID string     `json:"targetActorId"`
	RoleID        string     `json:"roleId"`
	RoleName      string     `json:"roleName"`
	RequestedBy   string     `json:"requestedBy"`
	Reason        string     `json:"reason"`
	Status        string     `json:"status"`
	ReviewedBy    string     `json:"reviewedBy"`
	ReviewNote    string     `json:"reviewNote"`
	Version       int        `json:"version"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	ReviewedAt    *time.Time `json:"reviewedAt,omitempty"`
}

func RequestStaffRoleAssignment(
	ctx context.Context,
	db *sql.DB,
	targetActorID string,
	roleID string,
	requestedBy string,
	reason string,
) (RoleAssignmentApproval, error) {
	targetActorID = strings.TrimSpace(targetActorID)
	roleID = strings.TrimSpace(roleID)
	requestedBy = strings.TrimSpace(requestedBy)
	reason = strings.TrimSpace(reason)
	if db == nil || targetActorID == "" || roleID == "" || requestedBy == "" || len(reason) < 5 {
		return RoleAssignmentApproval{}, ErrInvalid
	}
	if targetActorID == requestedBy {
		return RoleAssignmentApproval{}, ErrSelfApproval
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RoleAssignmentApproval{}, err
	}
	defer tx.Rollback()

	var out RoleAssignmentApproval
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_admin_approval_requests
			(action_type, target_actor_id, role_id, requested_by, reason)
		SELECT 'staff_role_assignment', $1, r.id, $3, $4
		FROM dsh_admin_roles r
		WHERE r.id = $2
		RETURNING id::TEXT, action_type, target_actor_id, role_id::TEXT,
		          (SELECT name FROM dsh_admin_roles WHERE id = role_id),
		          requested_by, reason, status, COALESCE(reviewed_by,''),
		          COALESCE(review_note,''), version, created_at, updated_at, reviewed_at`,
		targetActorID, roleID, requestedBy, reason).Scan(
		&out.ID, &out.ActionType, &out.TargetActorID, &out.RoleID, &out.RoleName,
		&out.RequestedBy, &out.Reason, &out.Status, &out.ReviewedBy,
		&out.ReviewNote, &out.Version, &out.CreatedAt, &out.UpdatedAt, &out.ReviewedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return RoleAssignmentApproval{}, ErrNotFound
	}
	if err != nil {
		// The partial unique index rejects duplicate pending requests.
		if strings.Contains(strings.ToLower(err.Error()), "uq_dsh_admin_pending_role_assignment") ||
			strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return RoleAssignmentApproval{}, ErrApprovalConflict
		}
		return RoleAssignmentApproval{}, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail)
		VALUES ($1, 'staff_role_assignment_requested', $2, $3)`,
		requestedBy, targetActorID, "role_id="+roleID+"; reason="+reason); err != nil {
		return RoleAssignmentApproval{}, err
	}
	if err := tx.Commit(); err != nil {
		return RoleAssignmentApproval{}, err
	}
	return out, nil
}

func ListRoleAssignmentApprovals(
	ctx context.Context,
	db *sql.DB,
	status string,
	limit int,
) ([]RoleAssignmentApproval, error) {
	status = strings.TrimSpace(status)
	if db == nil {
		return nil, ErrInvalid
	}
	if status != "" && status != "pending" && status != "approved" && status != "rejected" {
		return nil, ErrInvalid
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}
	rows, err := db.QueryContext(ctx, `
		SELECT a.id::TEXT, a.action_type, a.target_actor_id, a.role_id::TEXT,
		       r.name, a.requested_by, a.reason, a.status,
		       COALESCE(a.reviewed_by,''), COALESCE(a.review_note,''),
		       a.version, a.created_at, a.updated_at, a.reviewed_at
		FROM dsh_admin_approval_requests a
		JOIN dsh_admin_roles r ON r.id = a.role_id
		WHERE ($1 = '' OR a.status = $1)
		ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.created_at DESC
		LIMIT $2`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RoleAssignmentApproval, 0)
	for rows.Next() {
		var item RoleAssignmentApproval
		if err := rows.Scan(
			&item.ID, &item.ActionType, &item.TargetActorID, &item.RoleID, &item.RoleName,
			&item.RequestedBy, &item.Reason, &item.Status, &item.ReviewedBy,
			&item.ReviewNote, &item.Version, &item.CreatedAt, &item.UpdatedAt, &item.ReviewedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func ReviewStaffRoleAssignment(
	ctx context.Context,
	db *sql.DB,
	approvalID string,
	checkerActorID string,
	decision string,
	reviewNote string,
	expectedVersion int,
) (RoleAssignmentApproval, *StaffMember, error) {
	approvalID = strings.TrimSpace(approvalID)
	checkerActorID = strings.TrimSpace(checkerActorID)
	decision = strings.TrimSpace(decision)
	reviewNote = strings.TrimSpace(reviewNote)
	if db == nil || approvalID == "" || checkerActorID == "" || expectedVersion < 1 ||
		(decision != "approved" && decision != "rejected") {
		return RoleAssignmentApproval{}, nil, ErrInvalid
	}
	if decision == "rejected" && len(reviewNote) < 5 {
		return RoleAssignmentApproval{}, nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RoleAssignmentApproval{}, nil, err
	}
	defer tx.Rollback()

	var current RoleAssignmentApproval
	err = tx.QueryRowContext(ctx, `
		SELECT a.id::TEXT, a.action_type, a.target_actor_id, a.role_id::TEXT,
		       r.name, a.requested_by, a.reason, a.status,
		       COALESCE(a.reviewed_by,''), COALESCE(a.review_note,''),
		       a.version, a.created_at, a.updated_at, a.reviewed_at
		FROM dsh_admin_approval_requests a
		JOIN dsh_admin_roles r ON r.id = a.role_id
		WHERE a.id = $1
		FOR UPDATE OF a`, approvalID).Scan(
		&current.ID, &current.ActionType, &current.TargetActorID, &current.RoleID, &current.RoleName,
		&current.RequestedBy, &current.Reason, &current.Status, &current.ReviewedBy,
		&current.ReviewNote, &current.Version, &current.CreatedAt, &current.UpdatedAt, &current.ReviewedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return RoleAssignmentApproval{}, nil, ErrNotFound
	}
	if err != nil {
		return RoleAssignmentApproval{}, nil, err
	}
	if current.Status != "pending" || current.Version != expectedVersion {
		return RoleAssignmentApproval{}, nil, ErrApprovalConflict
	}
	if checkerActorID == current.RequestedBy || checkerActorID == current.TargetActorID {
		return RoleAssignmentApproval{}, nil, ErrSelfApproval
	}

	var assignment *StaffMember
	if decision == "approved" {
		var member StaffMember
		err = tx.QueryRowContext(ctx, `
			INSERT INTO dsh_admin_staff_assignments (actor_id, role_id, assigned_by)
			VALUES ($1, $2, $3)
			ON CONFLICT (actor_id, role_id) DO UPDATE
			SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()
			RETURNING id::TEXT, actor_id, role_id::TEXT,
			          (SELECT name FROM dsh_admin_roles WHERE id = role_id),
			          COALESCE(assigned_by,''), assigned_at`,
			current.TargetActorID, current.RoleID, checkerActorID).Scan(
			&member.ID, &member.ActorID, &member.RoleID, &member.RoleName,
			&member.AssignedBy, &member.AssignedAt,
		)
		if err != nil {
			return RoleAssignmentApproval{}, nil, err
		}
		assignment = &member
	}

	var reviewed RoleAssignmentApproval
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_approval_requests
		SET status = $2, reviewed_by = $3, review_note = $4,
		    reviewed_at = NOW(), updated_at = NOW(), version = version + 1
		WHERE id = $1 AND status = 'pending' AND version = $5
		RETURNING id::TEXT, action_type, target_actor_id, role_id::TEXT,
		          (SELECT name FROM dsh_admin_roles WHERE id = role_id),
		          requested_by, reason, status, COALESCE(reviewed_by,''),
		          COALESCE(review_note,''), version, created_at, updated_at, reviewed_at`,
		approvalID, decision, checkerActorID, reviewNote, expectedVersion).Scan(
		&reviewed.ID, &reviewed.ActionType, &reviewed.TargetActorID, &reviewed.RoleID, &reviewed.RoleName,
		&reviewed.RequestedBy, &reviewed.Reason, &reviewed.Status, &reviewed.ReviewedBy,
		&reviewed.ReviewNote, &reviewed.Version, &reviewed.CreatedAt, &reviewed.UpdatedAt, &reviewed.ReviewedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return RoleAssignmentApproval{}, nil, ErrApprovalConflict
	}
	if err != nil {
		return RoleAssignmentApproval{}, nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail)
		VALUES ($1, $2, $3, $4)`,
		checkerActorID, "staff_role_assignment_"+decision, current.TargetActorID,
		"approval_id="+approvalID+"; role_id="+current.RoleID+"; note="+reviewNote); err != nil {
		return RoleAssignmentApproval{}, nil, err
	}
	if err := tx.Commit(); err != nil {
		return RoleAssignmentApproval{}, nil, err
	}
	return reviewed, assignment, nil
}
