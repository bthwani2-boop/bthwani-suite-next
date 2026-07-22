package administration

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"
)

type auditExecutor interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

var permittedAuditDetailKeys = map[string]struct{}{
	"approval_id":        {},
	"request_id":         {},
	"role_id":            {},
	"source_approval_id": {},
	"decision":           {},
	"action_type":        {},
	"reason_provided":    {},
	"note_provided":      {},
	"permission_count":   {},
	"surface_count":      {},
}

func writeAdminAudit(
	ctx context.Context,
	executor auditExecutor,
	actorID string,
	action string,
	targetID string,
	details map[string]string,
) error {
	actorID = strings.TrimSpace(actorID)
	action = strings.TrimSpace(action)
	targetID = strings.TrimSpace(targetID)
	if executor == nil || actorID == "" || action == "" {
		return ErrInvalid
	}
	clean := make(map[string]string, len(details))
	for key, value := range details {
		key = strings.TrimSpace(key)
		if _, ok := permittedAuditDetailKeys[key]; !ok {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) > 120 {
			value = value[:120]
		}
		clean[key] = value
	}
	encoded, err := json.Marshal(clean)
	if err != nil {
		return err
	}
	_, err = executor.ExecContext(ctx, `
		INSERT INTO dsh_admin_audit (actor_id, action, target_id, detail, sensitivity)
		VALUES ($1, $2, NULLIF($3,''), $4, 'restricted')`,
		actorID, action, targetID, string(encoded))
	return err
}

func redactAuditDetail(detail string) string {
	detail = strings.TrimSpace(detail)
	if detail == "" {
		return ""
	}
	var object map[string]any
	if json.Unmarshal([]byte(detail), &object) == nil {
		clean := make(map[string]any, len(object))
		for key, value := range object {
			if _, ok := permittedAuditDetailKeys[key]; ok {
				clean[key] = value
			}
		}
		encoded, err := json.Marshal(clean)
		if err == nil {
			return string(encoded)
		}
	}
	parts := strings.Split(detail, ";")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		key, value, found := strings.Cut(strings.TrimSpace(part), "=")
		if !found {
			continue
		}
		key = strings.TrimSpace(key)
		if _, ok := permittedAuditDetailKeys[key]; !ok {
			continue
		}
		value = strings.TrimSpace(value)
		if len(value) > 120 {
			value = value[:120]
		}
		clean = append(clean, key+"="+value)
	}
	sort.Strings(clean)
	return strings.Join(clean, "; ")
}

type RollbackRequest struct {
	ID               string     `json:"id"`
	SourceApprovalID string     `json:"sourceApprovalId"`
	SourceActionType string     `json:"sourceActionType"`
	InverseActionType string    `json:"inverseActionType"`
	TargetActorID    string     `json:"targetActorId"`
	RoleID           string     `json:"roleId"`
	RoleName         string     `json:"roleName"`
	RequestedBy      string     `json:"requestedBy"`
	Reason           string     `json:"reason"`
	Status           string     `json:"status"`
	ReviewedBy       string     `json:"reviewedBy"`
	ReviewNote       string     `json:"reviewNote"`
	Version          int        `json:"version"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	ReviewedAt       *time.Time `json:"reviewedAt,omitempty"`
	SourceApprovedBy string     `json:"sourceApprovedBy"`
}

func inverseRoleAction(actionType string) (string, error) {
	switch actionType {
	case RoleChangeAssign:
		return RoleChangeRevoke, nil
	case RoleChangeRevoke:
		return RoleChangeAssign, nil
	default:
		return "", ErrInvalid
	}
}

func scanRollbackRequest(scanner interface{ Scan(...any) error }) (RollbackRequest, error) {
	var out RollbackRequest
	err := scanner.Scan(
		&out.ID, &out.SourceApprovalID, &out.SourceActionType, &out.InverseActionType,
		&out.TargetActorID, &out.RoleID, &out.RoleName, &out.RequestedBy, &out.Reason,
		&out.Status, &out.ReviewedBy, &out.ReviewNote, &out.Version,
		&out.CreatedAt, &out.UpdatedAt, &out.ReviewedAt, &out.SourceApprovedBy,
	)
	return out, err
}

const rollbackSelect = `
	SELECT rr.id::TEXT, rr.source_approval_id::TEXT, source.action_type,
	       rr.inverse_action_type, rr.target_actor_id, rr.role_id::TEXT,
	       role.name, rr.requested_by, rr.reason, rr.status,
	       COALESCE(rr.reviewed_by,''), COALESCE(rr.review_note,''), rr.version,
	       rr.created_at, rr.updated_at, rr.reviewed_at,
	       COALESCE(source.reviewed_by,'')
	FROM dsh_admin_rollback_requests rr
	JOIN dsh_admin_approval_requests source ON source.id = rr.source_approval_id
	JOIN dsh_admin_roles role ON role.id = rr.role_id`

func RequestDecisionRollback(
	ctx context.Context,
	db *sql.DB,
	sourceApprovalID string,
	requestedBy string,
	reason string,
) (RollbackRequest, error) {
	sourceApprovalID = strings.TrimSpace(sourceApprovalID)
	requestedBy = strings.TrimSpace(requestedBy)
	reason = strings.TrimSpace(reason)
	if db == nil || sourceApprovalID == "" || requestedBy == "" || len(reason) < 5 {
		return RollbackRequest{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RollbackRequest{}, err
	}
	defer tx.Rollback()

	var sourceAction, targetActorID, roleID string
	err = tx.QueryRowContext(ctx, `
		SELECT action_type, target_actor_id, role_id::TEXT
		FROM dsh_admin_approval_requests
		WHERE id = $1 AND status = 'approved'
		FOR SHARE`, sourceApprovalID).Scan(&sourceAction, &targetActorID, &roleID)
	if errors.Is(err, sql.ErrNoRows) {
		return RollbackRequest{}, ErrNotFound
	}
	if err != nil {
		return RollbackRequest{}, err
	}
	if requestedBy == targetActorID {
		return RollbackRequest{}, ErrSelfApproval
	}
	inverseAction, err := inverseRoleAction(sourceAction)
	if err != nil {
		return RollbackRequest{}, err
	}

	request, err := scanRollbackRequest(tx.QueryRowContext(ctx, `
		WITH inserted AS (
			INSERT INTO dsh_admin_rollback_requests
				(source_approval_id, inverse_action_type, target_actor_id, role_id, requested_by, reason)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		)`+rollbackSelect+`
		JOIN inserted ON inserted.id = rr.id`,
		sourceApprovalID, inverseAction, targetActorID, roleID, requestedBy, reason))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return RollbackRequest{}, ErrApprovalConflict
		}
		return RollbackRequest{}, err
	}
	if err := writeAdminAudit(ctx, tx, requestedBy, "administration_rollback_requested", targetActorID, map[string]string{
		"source_approval_id": sourceApprovalID,
		"role_id":            roleID,
		"action_type":        inverseAction,
		"reason_provided":    "true",
	}); err != nil {
		return RollbackRequest{}, err
	}
	if err := tx.Commit(); err != nil {
		return RollbackRequest{}, err
	}
	return request, nil
}

func ListRollbackRequests(ctx context.Context, db *sql.DB, status string, limit int) ([]RollbackRequest, error) {
	status = strings.TrimSpace(status)
	if db == nil || (status != "" && status != "pending" && status != "approved" && status != "rejected") {
		return nil, ErrInvalid
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}
	rows, err := db.QueryContext(ctx, rollbackSelect+`
		WHERE ($1 = '' OR rr.status = $1)
		ORDER BY CASE WHEN rr.status = 'pending' THEN 0 ELSE 1 END, rr.created_at DESC
		LIMIT $2`, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RollbackRequest, 0)
	for rows.Next() {
		item, scanErr := scanRollbackRequest(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func ReviewDecisionRollback(
	ctx context.Context,
	db *sql.DB,
	requestID string,
	checkerActorID string,
	decision string,
	reviewNote string,
	expectedVersion int,
) (RollbackRequest, *StaffMember, error) {
	requestID = strings.TrimSpace(requestID)
	checkerActorID = strings.TrimSpace(checkerActorID)
	decision = strings.TrimSpace(decision)
	reviewNote = strings.TrimSpace(reviewNote)
	if db == nil || requestID == "" || checkerActorID == "" || expectedVersion < 1 ||
		(decision != "approved" && decision != "rejected") ||
		(decision == "rejected" && len(reviewNote) < 5) {
		return RollbackRequest{}, nil, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return RollbackRequest{}, nil, err
	}
	defer tx.Rollback()

	current, err := scanRollbackRequest(tx.QueryRowContext(ctx, rollbackSelect+`
		WHERE rr.id = $1
		FOR UPDATE OF rr`, requestID))
	if errors.Is(err, sql.ErrNoRows) {
		return RollbackRequest{}, nil, ErrNotFound
	}
	if err != nil {
		return RollbackRequest{}, nil, err
	}
	if current.Status != "pending" || current.Version != expectedVersion {
		return RollbackRequest{}, nil, ErrApprovalConflict
	}
	if checkerActorID == current.RequestedBy || checkerActorID == current.TargetActorID || checkerActorID == current.SourceApprovedBy {
		return RollbackRequest{}, nil, ErrSelfApproval
	}

	var affected *StaffMember
	if decision == "approved" {
		var member StaffMember
		switch current.InverseActionType {
		case RoleChangeAssign:
			err = tx.QueryRowContext(ctx, `
				INSERT INTO dsh_admin_staff_assignments (actor_id, role_id, assigned_by)
				VALUES ($1, $2, $3)
				ON CONFLICT (actor_id, role_id) DO NOTHING
				RETURNING id::TEXT, actor_id, role_id::TEXT,
				          (SELECT name FROM dsh_admin_roles WHERE id = role_id),
				          COALESCE(assigned_by,''), assigned_at`,
				current.TargetActorID, current.RoleID, checkerActorID).Scan(
				&member.ID, &member.ActorID, &member.RoleID, &member.RoleName,
				&member.AssignedBy, &member.AssignedAt,
			)
		case RoleChangeRevoke:
			err = tx.QueryRowContext(ctx, `
				DELETE FROM dsh_admin_staff_assignments
				WHERE actor_id = $1 AND role_id = $2
				RETURNING id::TEXT, actor_id, role_id::TEXT,
				          (SELECT name FROM dsh_admin_roles WHERE id = role_id),
				          COALESCE(assigned_by,''), assigned_at`,
				current.TargetActorID, current.RoleID).Scan(
				&member.ID, &member.ActorID, &member.RoleID, &member.RoleName,
				&member.AssignedBy, &member.AssignedAt,
			)
		default:
			return RollbackRequest{}, nil, ErrInvalid
		}
		if errors.Is(err, sql.ErrNoRows) {
			return RollbackRequest{}, nil, ErrApprovalConflict
		}
		if err != nil {
			return RollbackRequest{}, nil, err
		}
		affected = &member
	}

	reviewed, err := scanRollbackRequest(tx.QueryRowContext(ctx, `
		WITH updated AS (
			UPDATE dsh_admin_rollback_requests
			SET status = $2, reviewed_by = $3, review_note = $4,
			    reviewed_at = NOW(), updated_at = NOW(), version = version + 1
			WHERE id = $1 AND status = 'pending' AND version = $5
			RETURNING id
		)`+rollbackSelect+`
		JOIN updated ON updated.id = rr.id`,
		requestID, decision, checkerActorID, reviewNote, expectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return RollbackRequest{}, nil, ErrApprovalConflict
	}
	if err != nil {
		return RollbackRequest{}, nil, err
	}
	if err := writeAdminAudit(ctx, tx, checkerActorID, "administration_rollback_"+decision, current.TargetActorID, map[string]string{
		"request_id":         requestID,
		"source_approval_id": current.SourceApprovalID,
		"role_id":            current.RoleID,
		"decision":           decision,
		"note_provided":      boolText(reviewNote != ""),
	}); err != nil {
		return RollbackRequest{}, nil, err
	}
	if err := tx.Commit(); err != nil {
		return RollbackRequest{}, nil, err
	}
	return reviewed, affected, nil
}

func boolText(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

type AdministrationDiagnostics struct {
	Status                     string    `json:"status"`
	ActiveRoleCount            int       `json:"activeRoleCount"`
	ApprovedAssignmentCount    int       `json:"approvedAssignmentCount"`
	PendingRoleDefinitionCount int       `json:"pendingRoleDefinitionCount"`
	PendingRoleAssignmentCount int       `json:"pendingRoleAssignmentCount"`
	PendingRollbackCount       int       `json:"pendingRollbackCount"`
	RecentRestrictedAuditCount int       `json:"recentRestrictedAuditCount"`
	GeneratedAt                time.Time `json:"generatedAt"`
}

func GetAdministrationDiagnostics(ctx context.Context, db *sql.DB) (AdministrationDiagnostics, error) {
	if db == nil {
		return AdministrationDiagnostics{}, ErrInvalid
	}
	var out AdministrationDiagnostics
	err := db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*) FROM dsh_admin_roles WHERE active = TRUE),
			(SELECT COUNT(*) FROM dsh_admin_staff_assignments),
			(SELECT COUNT(*) FROM dsh_admin_role_definition_requests WHERE status = 'pending'),
			(SELECT COUNT(*) FROM dsh_admin_approval_requests WHERE status = 'pending'),
			(SELECT COUNT(*) FROM dsh_admin_rollback_requests WHERE status = 'pending'),
			(SELECT COUNT(*) FROM dsh_admin_audit WHERE sensitivity = 'restricted' AND created_at >= NOW() - INTERVAL '24 hours'),
			NOW()`).Scan(
		&out.ActiveRoleCount,
		&out.ApprovedAssignmentCount,
		&out.PendingRoleDefinitionCount,
		&out.PendingRoleAssignmentCount,
		&out.PendingRollbackCount,
		&out.RecentRestrictedAuditCount,
		&out.GeneratedAt,
	)
	if err != nil {
		return AdministrationDiagnostics{}, err
	}
	out.Status = "healthy"
	if out.PendingRoleDefinitionCount+out.PendingRoleAssignmentCount+out.PendingRollbackCount > 0 {
		out.Status = "attention"
	}
	return out, nil
}
