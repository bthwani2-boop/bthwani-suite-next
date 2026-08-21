package partnerteam

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"dsh-api/internal/partner"
)

var (
	ErrNotFound        = errors.New("partner team member not found")
	ErrAlreadyBound    = errors.New("partner team identity is already bound")
	ErrVersionConflict = errors.New("partner team member version conflict")
	ErrInvalid         = errors.New("invalid partner team request")
)

type TeamMemberAction struct {
	Action          string
	ExpectedVersion int
	IdempotencyKey  string
	CorrelationID   string
}

func statusProjection(status string) (string, string, string) {
	switch status {
	case "active":
		return "active", "نشط", "pause"
	case "suspended":
		return "paused", "موقوف مؤقتًا", "activate"
	case "invited":
		return "invited", "مدعو", "cancel-invite"
	case "ended":
		return "blocked", "منتهٍ", "activate"
	default:
		return "review-needed", "قيد المراجعة", "audit-log"
	}
}

func actionLabel(action string) string {
	switch action {
	case "pause":
		return "إيقاف مؤقت"
	case "activate":
		return "تفعيل"
	case "block":
		return "حظر"
	case "resend-invite":
		return "إعادة إرسال الدعوة"
	case "cancel-invite":
		return "إلغاء الدعوة"
	default:
		return "سجل التدقيق"
	}
}

func scanMember(row interface{ Scan(dest ...any) error }) (partner.StoreTeamMember, error) {
	var member partner.StoreTeamMember
	var storeID, actorID, role, status, branch, delivery string
	var version int
	if err := row.Scan(&member.ID, &storeID, &actorID, &role, &status, &branch, &delivery, &version); err != nil {
		return partner.StoreTeamMember{}, err
	}
	projectedStatus, statusLabel, action := statusProjection(status)
	name := strings.TrimSpace(actorID)
	if name == "" {
		name = member.ID
	}
	member.Name = name
	member.Role = role
	member.RoleLabel = map[string]string{"owner": "المالك / المدير العام", "supervisor": "مشرف المتجر", "staff": "عضو فريق التشغيل"}[role]
	member.Status = projectedStatus
	member.StatusLabel = statusLabel
	member.BranchAssignment = branch
	member.PermissionsSummary = "تشغيل المتجر المحدد"
	member.DeliveryAssignment = delivery
	member.InviteLifecycle = status
	member.OperationalImpact = "تُقرأ العضوية من DSH canonical membership"
	member.AuditNote = "DSH membership " + member.ID
	member.InlineAction = action
	member.InlineActionLabel = actionLabel(action)
	member.Version = version
	_ = storeID
	return member, nil
}

func List(ctx context.Context, db *sql.DB, storeID string) ([]partner.StoreTeamMember, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT m.id, m.store_id, m.captain_actor_id, m.team_role, m.status,
		       m.branch_assignment, m.delivery_assignment, m.version
		FROM dsh_captain_memberships m
		WHERE m.store_id = $1 AND m.affiliation = 'PARTNER'
		ORDER BY m.created_at DESC, m.id DESC`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	members := make([]partner.StoreTeamMember, 0)
	for rows.Next() {
		member, err := scanMember(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

func Invite(ctx context.Context, db *sql.DB, storeID, identity, role, actorID string) (partner.StoreTeamMember, error) {
	identity = strings.TrimSpace(identity)
	if identity == "" || storeID == "" || actorID == "" || (role != "manager" && role != "supervisor" && role != "staff") {
		return partner.StoreTeamMember{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		"dsh-partner-team-invite:"+storeID+":"+strings.ToLower(identity)); err != nil {
		return partner.StoreTeamMember{}, err
	}

	var existingID, existingStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT id, status
		FROM dsh_captain_memberships
		WHERE store_id = $1 AND affiliation = 'PARTNER'
		  AND lower(btrim(captain_actor_id)) = lower($2)
		  AND status IN ('invited', 'active')
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, storeID, identity).Scan(&existingID, &existingStatus)
	if err == nil {
		if existingStatus == "active" {
			return partner.StoreTeamMember{}, ErrAlreadyBound
		}
		member, scanErr := scanMember(tx.QueryRowContext(ctx, `
			SELECT id, store_id, captain_actor_id, team_role, status, branch_assignment, delivery_assignment, version
			FROM dsh_captain_memberships WHERE id = $1`, existingID))
		if scanErr != nil {
			return partner.StoreTeamMember{}, scanErr
		}
		if err := tx.Commit(); err != nil {
			return partner.StoreTeamMember{}, err
		}
		return member, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return partner.StoreTeamMember{}, err
	}

	var memberID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dsh_captain_memberships (captain_actor_id, affiliation, partner_id, store_id, team_role, status)
		SELECT $1, 'PARTNER', partner_id, $2, $3, 'invited'
		FROM dsh_stores WHERE id = $2 AND status = 'published'
		RETURNING id`, identity, storeID, map[string]string{"manager": "owner", "supervisor": "supervisor", "staff": "staff"}[role]).Scan(&memberID)
	if errors.Is(err, sql.ErrNoRows) {
		return partner.StoreTeamMember{}, ErrNotFound
	}
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_captain_membership_history (membership_id, action_label, actor_id, from_status, to_status, idempotency_key, correlation_id)
		VALUES ($1, 'partner_team_invite', $2, '', 'invited', '', '')`, memberID, actorID); err != nil {
		return partner.StoreTeamMember{}, err
	}
	member, err := scanMember(tx.QueryRowContext(ctx, `
		SELECT id, store_id, captain_actor_id, team_role, status, branch_assignment, delivery_assignment, version
		FROM dsh_captain_memberships WHERE id = $1`, memberID))
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	if err := tx.Commit(); err != nil {
		return partner.StoreTeamMember{}, err
	}
	return member, nil
}

func ExecuteAction(ctx context.Context, db *sql.DB, storeID, memberID, actorID string, input TeamMemberAction) (partner.StoreTeamMember, error) {
	if storeID == "" || memberID == "" || actorID == "" || input.ExpectedVersion < 1 {
		return partner.StoreTeamMember{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	defer func() { _ = tx.Rollback() }()
	if strings.TrimSpace(input.IdempotencyKey) != "" {
		var existingID string
		err = tx.QueryRowContext(ctx, `
			SELECT membership_id
			FROM dsh_captain_membership_history
			WHERE membership_id = $1 AND idempotency_key = $2`, memberID, input.IdempotencyKey).Scan(&existingID)
		if err == nil {
			member, scanErr := scanMember(tx.QueryRowContext(ctx, `
				SELECT id, store_id, captain_actor_id, team_role, status, branch_assignment, delivery_assignment, version
				FROM dsh_captain_memberships WHERE id = $1`, existingID))
			if scanErr != nil {
				return partner.StoreTeamMember{}, scanErr
			}
			if commitErr := tx.Commit(); commitErr != nil {
				return partner.StoreTeamMember{}, commitErr
			}
			return member, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return partner.StoreTeamMember{}, err
		}
	}
	var oldStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT status FROM dsh_captain_memberships
		WHERE id = $1 AND store_id = $2 AND affiliation = 'PARTNER'
		FOR UPDATE`, memberID, storeID).Scan(&oldStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return partner.StoreTeamMember{}, ErrNotFound
	}
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	newStatus := oldStatus
	switch input.Action {
	case "pause":
		if oldStatus != "active" {
			return partner.StoreTeamMember{}, ErrInvalid
		}
		newStatus = "suspended"
	case "activate":
		if oldStatus != "suspended" {
			return partner.StoreTeamMember{}, ErrInvalid
		}
		newStatus = "active"
	case "block", "cancel-invite":
		if oldStatus != "active" && oldStatus != "suspended" && oldStatus != "invited" {
			return partner.StoreTeamMember{}, ErrInvalid
		}
		newStatus = "ended"
	case "resend-invite":
		if oldStatus != "invited" {
			return partner.StoreTeamMember{}, ErrInvalid
		}
	default:
		return partner.StoreTeamMember{}, ErrInvalid
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_captain_memberships
		SET status = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2 AND store_id = $3 AND version = $4`, newStatus, memberID, storeID, input.ExpectedVersion)
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	changed, err := result.RowsAffected()
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	if changed != 1 {
		return partner.StoreTeamMember{}, ErrVersionConflict
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_captain_membership_history (membership_id, action_label, actor_id, from_status, to_status, idempotency_key, correlation_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`, memberID, "partner_team_"+input.Action, actorID, oldStatus, newStatus, input.IdempotencyKey, input.CorrelationID); err != nil {
		return partner.StoreTeamMember{}, err
	}
	member, err := scanMember(tx.QueryRowContext(ctx, `
		SELECT id, store_id, captain_actor_id, team_role, status, branch_assignment, delivery_assignment, version
		FROM dsh_captain_memberships WHERE id = $1`, memberID))
	if err != nil {
		return partner.StoreTeamMember{}, err
	}
	if err := tx.Commit(); err != nil {
		return partner.StoreTeamMember{}, err
	}
	return member, nil
}
