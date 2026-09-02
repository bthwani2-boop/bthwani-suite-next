package supportsession

import (
	"context"
	"database/sql"
	"dsh-api/internal/opctx"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalid      = errors.New("invalid support session request")
	ErrNotFound     = errors.New("support session request not found")
	ErrConflict     = errors.New("support session request conflict")
	ErrSelfApproval = errors.New("support session maker, target, and checker must differ")
)

type Request struct {
	ID                string     `json:"id"`
	OperatorContextID string     `json:"operatorContextId"`
	TargetActorID     string     `json:"targetActorId"`
	RequestedBy       string     `json:"requestedBy"`
	Reason            string     `json:"reason"`
	DurationMinutes   int        `json:"durationMinutes"`
	Status            string     `json:"status"`
	ReviewedBy        string     `json:"reviewedBy"`
	ReviewNote        string     `json:"reviewNote"`
	IdentitySessionID string     `json:"identitySessionId"`
	ExpiresAt         *time.Time `json:"expiresAt,omitempty"`
	Version           int        `json:"version"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	ReviewedAt        *time.Time `json:"reviewedAt,omitempty"`
	IssuedAt          *time.Time `json:"issuedAt,omitempty"`
	RevokedAt         *time.Time `json:"revokedAt,omitempty"`
}

func scanRequest(scanner interface{ Scan(...any) error }) (Request, error) {
	var out Request
	err := scanner.Scan(
		&out.ID,
		&out.OperatorContextID,
		&out.TargetActorID,
		&out.RequestedBy,
		&out.Reason,
		&out.DurationMinutes,
		&out.Status,
		&out.ReviewedBy,
		&out.ReviewNote,
		&out.IdentitySessionID,
		&out.ExpiresAt,
		&out.Version,
		&out.CreatedAt,
		&out.UpdatedAt,
		&out.ReviewedAt,
		&out.IssuedAt,
		&out.RevokedAt,
	)
	return out, err
}

const requestColumns = `
		id::TEXT, operator_context_id, target_actor_id, requested_by, reason, duration_minutes,
	status, COALESCE(reviewed_by,''), COALESCE(review_note,''),
	COALESCE(identity_session_id,''), expires_at, version,
	created_at, updated_at, reviewed_at, issued_at, revoked_at`

func requireOperatorContext(ctx context.Context) (string, error) {
	operatorContextID, ok := opctx.OperatorContextIDFromContext(ctx)
	if !ok {
		return "", ErrInvalid
	}
	return operatorContextID, nil
}

func supportAuditDetail(requestID string, reasonProvided, noteProvided bool) (string, error) {
	detail := map[string]any{"request_id": strings.TrimSpace(requestID)}
	if reasonProvided {
		detail["reason_provided"] = true
	}
	if noteProvided {
		detail["note_provided"] = true
	}
	encoded, err := json.Marshal(detail)
	return string(encoded), err
}

func appendSupportAudit(
	ctx context.Context,
	tx *sql.Tx,
	actorID string,
	action string,
	targetID string,
	requestID string,
	reasonProvided bool,
	noteProvided bool,
) error {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return contextErr
	}
	detail, err := supportAuditDetail(requestID, reasonProvided, noteProvided)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO dsh_admin_audit
				(operator_context_id, actor_id, action, target_id, detail, sensitivity, correlation_id)
			VALUES ($1, $2, $3, $4, $5, 'restricted', $6)`,
		operatorContextID, strings.TrimSpace(actorID), action, strings.TrimSpace(targetID), detail, strings.TrimSpace(requestID))
	return err
}

func CreateRequest(
	ctx context.Context,
	db *sql.DB,
	targetActorID string,
	requestedBy string,
	reason string,
	durationMinutes int,
) (Request, error) {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return Request{}, contextErr
	}
	targetActorID = strings.TrimSpace(targetActorID)
	requestedBy = strings.TrimSpace(requestedBy)
	reason = strings.TrimSpace(reason)
	if db == nil || targetActorID == "" || requestedBy == "" || targetActorID == requestedBy ||
		len(reason) < 5 || durationMinutes < 1 || durationMinutes > 15 {
		return Request{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Request{}, err
	}
	defer func() { _ = tx.Rollback() }()
	request, err := scanRequest(tx.QueryRowContext(ctx, `
INSERT INTO dsh_admin_support_session_requests
				(operator_context_id, target_actor_id, requested_by, reason, duration_minutes)
			VALUES ($1, $2, $3, $4, $5)
		RETURNING `+requestColumns,
		operatorContextID, targetActorID, requestedBy, reason, durationMinutes))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return Request{}, ErrConflict
		}
		return Request{}, err
	}
	if err := appendSupportAudit(ctx, tx, requestedBy, "support_session_requested", targetActorID, request.ID, true, false); err != nil {
		return Request{}, err
	}
	if err := tx.Commit(); err != nil {
		return Request{}, err
	}
	return request, nil
}

func ListRequests(ctx context.Context, db *sql.DB, status string, limit int) ([]Request, error) {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return nil, contextErr
	}
	status = strings.TrimSpace(status)
	if db == nil || (status != "" && status != "pending" && status != "approved" &&
		status != "rejected" && status != "issued" && status != "revoked") {
		return nil, ErrInvalid
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}
	rows, err := db.QueryContext(ctx, `
		SELECT `+requestColumns+`
		FROM dsh_admin_support_session_requests
		WHERE operator_context_id = $2 AND ($1 = '' OR status = $1)
			ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'issued' THEN 2 ELSE 3 END,
		         created_at DESC
		LIMIT $3`, status, operatorContextID, limit)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	out := make([]Request, 0)
	for rows.Next() {
		request, scanErr := scanRequest(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		out = append(out, request)
	}
	return out, rows.Err()
}

// ReviewRequest records the independent decision. An already-approved request
// may be replayed by the same checker so the Identity handoff remains retryable.
func ReviewRequest(
	ctx context.Context,
	db *sql.DB,
	requestID string,
	checkerActorID string,
	decision string,
	reviewNote string,
	expectedVersion int,
) (Request, error) {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return Request{}, contextErr
	}
	requestID = strings.TrimSpace(requestID)
	checkerActorID = strings.TrimSpace(checkerActorID)
	decision = strings.TrimSpace(decision)
	reviewNote = strings.TrimSpace(reviewNote)
	if db == nil || requestID == "" || checkerActorID == "" || expectedVersion < 1 ||
		(decision != "approved" && decision != "rejected") ||
		(decision == "rejected" && len(reviewNote) < 5) {
		return Request{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Request{}, err
	}
	defer func() { _ = tx.Rollback() }()
	current, err := scanRequest(tx.QueryRowContext(ctx, `
		SELECT `+requestColumns+`
		FROM dsh_admin_support_session_requests
WHERE id = $1 AND operator_context_id = $2
			FOR UPDATE`, requestID, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return Request{}, ErrNotFound
	}
	if err != nil {
		return Request{}, err
	}
	if checkerActorID == current.RequestedBy || checkerActorID == current.TargetActorID {
		return Request{}, ErrSelfApproval
	}
	if current.Status == "issued" && decision == "approved" && current.ReviewedBy == checkerActorID {
		if err := tx.Commit(); err != nil {
			return Request{}, err
		}
		return current, nil
	}
	if current.Status == "approved" && decision == "approved" &&
		current.ReviewedBy == checkerActorID && current.Version == expectedVersion {
		if err := tx.Commit(); err != nil {
			return Request{}, err
		}
		return current, nil
	}
	if current.Status != "pending" || current.Version != expectedVersion {
		return Request{}, ErrConflict
	}
	updated, err := scanRequest(tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_support_session_requests
		SET status = $2, reviewed_by = $3, review_note = $4,
		    reviewed_at = NOW(), updated_at = NOW(), version = version + 1
WHERE id = $1 AND operator_context_id = $6 AND status = 'pending' AND version = $5
			RETURNING `+requestColumns,
		requestID, decision, checkerActorID, reviewNote, expectedVersion, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return Request{}, ErrConflict
	}
	if err != nil {
		return Request{}, err
	}
	if err := appendSupportAudit(ctx, tx, checkerActorID, "support_session_"+decision, current.TargetActorID, requestID, false, reviewNote != ""); err != nil {
		return Request{}, err
	}
	if err := tx.Commit(); err != nil {
		return Request{}, err
	}
	return updated, nil
}

func MarkIssued(
	ctx context.Context,
	db *sql.DB,
	requestID string,
	sessionID string,
	expiresAt time.Time,
) (Request, error) {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return Request{}, contextErr
	}
	if db == nil || strings.TrimSpace(requestID) == "" || strings.TrimSpace(sessionID) == "" {
		return Request{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Request{}, err
	}
	defer func() { _ = tx.Rollback() }()
	request, err := scanRequest(tx.QueryRowContext(ctx, `
			SELECT `+requestColumns+`
			FROM dsh_admin_support_session_requests
			WHERE id = $1 AND operator_context_id = $2
			FOR UPDATE`, requestID, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return Request{}, ErrNotFound
	}
	if err != nil {
		return Request{}, err
	}
	if request.Status != "approved" && request.Status != "issued" {
		return Request{}, ErrConflict
	}
	if request.Status == "issued" && request.IdentitySessionID == strings.TrimSpace(sessionID) {
		if err := tx.Commit(); err != nil {
			return Request{}, err
		}
		return request, nil
	}
	request, err = scanRequest(tx.QueryRowContext(ctx, `
			UPDATE dsh_admin_support_session_requests
			SET status = 'issued', identity_session_id = $2, expires_at = $3,
			    issued_at = COALESCE(issued_at, NOW()), updated_at = NOW(), version = version + 1
			WHERE id = $1 AND operator_context_id = $4 AND status IN ('approved','issued')
			RETURNING `+requestColumns,
		requestID, strings.TrimSpace(sessionID), expiresAt, operatorContextID))
	if err != nil {
		return Request{}, err
	}
	if err := appendSupportAudit(ctx, tx, request.ReviewedBy, "support_session_issued", request.TargetActorID, request.ID, false, false); err != nil {
		return Request{}, err
	}
	if err := tx.Commit(); err != nil {
		return Request{}, err
	}
	return request, nil
}

func MarkRevoked(ctx context.Context, db *sql.DB, requestID string, actorID string, reason string) (Request, error) {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return Request{}, contextErr
	}
	if db == nil || strings.TrimSpace(requestID) == "" || strings.TrimSpace(actorID) == "" || len(strings.TrimSpace(reason)) < 5 {
		return Request{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Request{}, err
	}
	defer func() { _ = tx.Rollback() }()
	request, err := scanRequest(tx.QueryRowContext(ctx, `
		UPDATE dsh_admin_support_session_requests
		SET status = 'revoked', revoked_at = NOW(), updated_at = NOW(), version = version + 1
WHERE id = $1 AND operator_context_id = $2 AND status = 'issued'
			RETURNING `+requestColumns, requestID, operatorContextID))
	if errors.Is(err, sql.ErrNoRows) {
		return Request{}, ErrConflict
	}
	if err != nil {
		return Request{}, err
	}
	if err := appendSupportAudit(ctx, tx, actorID, "support_session_revoked", request.TargetActorID, requestID, true, false); err != nil {
		return Request{}, err
	}
	if err := tx.Commit(); err != nil {
		return Request{}, err
	}
	return request, nil
}

// RecordPartnerSupportAccess makes the audit append a required part of entering
// the governed support scope. Callers must fail closed when it cannot commit.
func RecordPartnerSupportAccess(ctx context.Context, db *sql.DB, identity Identity, targetPartnerID string) error {
	if _, err := requireOperatorContext(ctx); err != nil {
		return err
	}
	if db == nil || strings.TrimSpace(identity.InitiatorActorID) == "" ||
		strings.TrimSpace(identity.SupportRequestID) == "" || strings.TrimSpace(targetPartnerID) == "" {
		return ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := appendSupportAudit(ctx, tx, identity.InitiatorActorID, "partner_support_access", targetPartnerID, identity.SupportRequestID, false, false); err != nil {
		return err
	}
	return tx.Commit()
}

type SnapshotRole struct {
	RoleID     string    `json:"roleId"`
	RoleName   string    `json:"roleName"`
	AssignedBy string    `json:"assignedBy"`
	AssignedAt time.Time `json:"assignedAt"`
}

type SnapshotAudit struct {
	Action    string    `json:"action"`
	TargetID  string    `json:"targetId"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"createdAt"`
}

type Snapshot struct {
	TargetActorID string          `json:"targetActorId"`
	Roles         []SnapshotRole  `json:"roles"`
	RecentAudit   []SnapshotAudit `json:"recentAudit"`
	GeneratedAt   time.Time       `json:"generatedAt"`
}

func LoadSnapshot(ctx context.Context, db *sql.DB, targetActorID string) (Snapshot, error) {
	operatorContextID, contextErr := requireOperatorContext(ctx)
	if contextErr != nil {
		return Snapshot{}, contextErr
	}
	targetActorID = strings.TrimSpace(targetActorID)
	if db == nil || targetActorID == "" {
		return Snapshot{}, ErrInvalid
	}
	var requestOwned bool
	if err := db.QueryRowContext(ctx, `SELECT EXISTS (
		SELECT 1 FROM dsh_admin_support_session_requests
		WHERE operator_context_id=$1 AND target_actor_id=$2 AND status IN ('approved','issued','revoked'))`, operatorContextID, targetActorID).Scan(&requestOwned); err != nil {
		return Snapshot{}, err
	}
	if !requestOwned {
		return Snapshot{}, ErrNotFound
	}
	// Roles is intentionally empty: dsh_admin_staff_assignments (a local DSH
	// role-assignment table) was retired in favor of Identity as the single
	// registry of roles, permissions and assignments (J008); Identity's
	// permission grants carry no roleId/assignedBy/assignedAt, so they cannot
	// be mapped onto SnapshotRole without inventing data. A permission-summary
	// replacement for this field is J008 surface work, not part of restoring
	// this endpoint to a non-erroring state.
	snapshot := Snapshot{
		TargetActorID: targetActorID,
		Roles:         []SnapshotRole{},
		RecentAudit:   []SnapshotAudit{},
		GeneratedAt:   time.Now().UTC(),
	}
	auditRows, err := db.QueryContext(ctx, `
		SELECT action, COALESCE(target_id,''), COALESCE(detail,''), created_at
		FROM dsh_admin_audit
		WHERE operator_context_id = $1 AND (actor_id = $2 OR target_id = $2)
		ORDER BY created_at DESC
		LIMIT 50`, operatorContextID, targetActorID)
	if err != nil {
		return Snapshot{}, err
	}
	defer func() { _ = auditRows.Close() }()
	for auditRows.Next() {
		var entry SnapshotAudit
		if err := auditRows.Scan(&entry.Action, &entry.TargetID, &entry.Detail, &entry.CreatedAt); err != nil {
			return Snapshot{}, err
		}
		snapshot.RecentAudit = append(snapshot.RecentAudit, entry)
	}
	return snapshot, auditRows.Err()
}
