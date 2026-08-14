package fieldassignment

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Status string

const (
	StatusAssigned    Status = "assigned"
	StatusInProgress  Status = "in_progress"
	StatusDraftLinked Status = "draft_linked"
	StatusCancelled   Status = "cancelled"
)

var (
	ErrInvalid           = errors.New("invalid field onboarding assignment")
	ErrNotFound          = errors.New("field onboarding assignment not found")
	ErrForbidden         = errors.New("field onboarding assignment forbidden")
	ErrVersionConflict   = errors.New("field onboarding assignment version conflict")
	ErrInvalidTransition = errors.New("invalid field onboarding assignment transition")
)

type Assignment struct {
	ID                string     `json:"id"`
	OperatorContextID string     `json:"operatorContextId"`
	FieldActorID      string     `json:"fieldActorId"`
	BusinessTaskKey   string     `json:"businessTaskKey"`
	StoreNameHint     string     `json:"storeNameHint"`
	PhoneHint         string     `json:"phoneHint,omitempty"`
	AddressHint       string     `json:"addressHint,omitempty"`
	LocationLatitude  *float64   `json:"locationLatitude,omitempty"`
	LocationLongitude *float64   `json:"locationLongitude,omitempty"`
	Status            Status     `json:"status"`
	Priority          string     `json:"priority"`
	DueAt             *time.Time `json:"dueAt,omitempty"`
	SlaMinutes        int        `json:"slaMinutes"`
	Overdue           bool       `json:"overdue"`
	DraftPartnerID    string     `json:"draftPartnerId,omitempty"`
	Version           int        `json:"version"`
	CreatedByActorID  string     `json:"createdByActorId"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

type CreateInput struct {
	FieldActorID      string     `json:"fieldActorId"`
	BusinessTaskKey   string     `json:"businessTaskKey"`
	StoreNameHint     string     `json:"storeNameHint"`
	PhoneHint         string     `json:"phoneHint"`
	AddressHint       string     `json:"addressHint"`
	LocationLatitude  *float64   `json:"locationLatitude"`
	LocationLongitude *float64   `json:"locationLongitude"`
	Priority          string     `json:"priority"`
	DueAt             *time.Time `json:"dueAt"`
	SlaMinutes        int        `json:"slaMinutes"`
}

type TransitionInput struct {
	ExpectedVersion int    `json:"expectedVersion"`
	Reason          string `json:"reason"`
}

type ReassignInput struct {
	ExpectedVersion int    `json:"expectedVersion"`
	FieldActorID    string `json:"fieldActorId"`
	Reason          string `json:"reason"`
	Handoff         bool   `json:"handoff"`
}

func (input CreateInput) Validate() error {
	if strings.TrimSpace(input.FieldActorID) == "" || strings.TrimSpace(input.BusinessTaskKey) == "" || strings.TrimSpace(input.StoreNameHint) == "" {
		return fmt.Errorf("%w: field actor, business task and store name are required", ErrInvalid)
	}
	if strings.TrimSpace(input.PhoneHint) == "" && strings.TrimSpace(input.AddressHint) == "" {
		return fmt.Errorf("%w: phone or address is required", ErrInvalid)
	}
	if (input.LocationLatitude == nil) != (input.LocationLongitude == nil) {
		return fmt.Errorf("%w: latitude and longitude must be provided together", ErrInvalid)
	}
	if input.LocationLatitude != nil && (*input.LocationLatitude < -90 || *input.LocationLatitude > 90) {
		return fmt.Errorf("%w: latitude is outside range", ErrInvalid)
	}
	if input.LocationLongitude != nil && (*input.LocationLongitude < -180 || *input.LocationLongitude > 180) {
		return fmt.Errorf("%w: longitude is outside range", ErrInvalid)
	}
	if input.Priority != "" && input.Priority != "low" && input.Priority != "normal" && input.Priority != "high" && input.Priority != "urgent" {
		return fmt.Errorf("%w: invalid priority", ErrInvalid)
	}
	if input.SlaMinutes < 0 || input.SlaMinutes > 43200 {
		return fmt.Errorf("%w: invalid SLA", ErrInvalid)
	}
	return nil
}

func normalizeCreateInput(input CreateInput) CreateInput {
	input.FieldActorID = strings.TrimSpace(input.FieldActorID)
	input.BusinessTaskKey = strings.TrimSpace(input.BusinessTaskKey)
	input.StoreNameHint = strings.TrimSpace(input.StoreNameHint)
	input.PhoneHint = strings.TrimSpace(input.PhoneHint)
	input.AddressHint = strings.TrimSpace(input.AddressHint)
	if input.Priority == "" {
		input.Priority = "normal"
	}
	if input.SlaMinutes == 0 {
		input.SlaMinutes = 1440
	}
	if input.DueAt == nil {
		dueAt := time.Now().UTC().Add(time.Duration(input.SlaMinutes) * time.Minute)
		input.DueAt = &dueAt
	}
	return input
}

func applyDerived(a *Assignment) {
	a.Overdue = a.DueAt != nil && time.Now().UTC().After(*a.DueAt) && IsActive(a.Status)
}

func validateReassign(previousStatus Status, input ReassignInput) error {
	if strings.TrimSpace(input.FieldActorID) == "" || input.ExpectedVersion <= 0 {
		return ErrInvalid
	}
	if previousStatus == StatusInProgress && !input.Handoff {
		return ErrInvalidTransition
	}
	return nil
}

func Create(ctx context.Context, db *sql.DB, operatorContextID, actorID string, input CreateInput) (Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	input = normalizeCreateInput(input)
	if operatorContextID == "" || actorID == "" {
		return Assignment{}, fmt.Errorf("%w: trusted operator context and actor are required", ErrInvalid)
	}
	if err := input.Validate(); err != nil {
		return Assignment{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Assignment{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	assignment, err := insert(ctx, tx, operatorContextID, actorID, input)
	if err != nil {
		return Assignment{}, err
	}
	if err := appendEvent(ctx, tx, assignment, "created", "", string(StatusAssigned), actorID, "", input.FieldActorID, "", ""); err != nil {
		return Assignment{}, err
	}
	if err := tx.Commit(); err != nil {
		return Assignment{}, err
	}
	return assignment, nil
}

func insert(ctx context.Context, tx *sql.Tx, operatorContextID, actorID string, input CreateInput) (Assignment, error) {
	var a Assignment
	err := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_field_onboarding_assignments
			(operator_context_id, field_actor_id, business_task_key, store_name_hint, phone_hint, address_hint,
			 location_latitude, location_longitude, status, priority, due_at, sla_minutes, created_by_actor_id)
		VALUES ($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),$7,$8,'assigned',$9,$10,$11,$12)
		RETURNING id, operator_context_id, field_actor_id, business_task_key, store_name_hint,
		          COALESCE(phone_hint,''), COALESCE(address_hint,''), location_latitude,
			location_longitude, status, priority, due_at, sla_minutes, COALESCE(draft_partner_id,''), version,
		          created_by_actor_id, created_at, updated_at`,
		operatorContextID, input.FieldActorID, input.BusinessTaskKey, input.StoreNameHint, input.PhoneHint, input.AddressHint,
		input.LocationLatitude, input.LocationLongitude, input.Priority, input.DueAt, input.SlaMinutes, actorID,
	).Scan(&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.StoreNameHint,
		&a.BusinessTaskKey, &a.StoreNameHint, &a.PhoneHint, &a.AddressHint, &a.LocationLatitude, &a.LocationLongitude,
		&a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes, &a.DraftPartnerID, &a.Version, &a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt)
	applyDerived(&a)
	return a, err
}

func Get(ctx context.Context, db *sql.DB, operatorContextID, id string) (Assignment, error) {
	var a Assignment
	err := db.QueryRowContext(ctx, `
		SELECT id, operator_context_id, field_actor_id, business_task_key, store_name_hint,
		       COALESCE(phone_hint,''), COALESCE(address_hint,''), location_latitude,
		       location_longitude, status, priority, due_at, sla_minutes, COALESCE(draft_partner_id,''), version,
		       created_by_actor_id, created_at, updated_at
		FROM dsh_field_onboarding_assignments
		WHERE id = $1 AND operator_context_id = $2`, id, strings.TrimSpace(operatorContextID)).Scan(
		&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.BusinessTaskKey, &a.StoreNameHint, &a.PhoneHint,
		&a.AddressHint, &a.LocationLatitude, &a.LocationLongitude, &a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes,
		&a.DraftPartnerID, &a.Version, &a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Assignment{}, ErrNotFound
	}
	applyDerived(&a)
	return a, err
}

func ListForOperator(ctx context.Context, db *sql.DB, operatorContextID string) ([]Assignment, error) {
	return list(ctx, db, `operator_context_id = $1`, operatorContextID)
}

func ListForField(ctx context.Context, db *sql.DB, operatorContextID, fieldActorID string) ([]Assignment, error) {
	return list(ctx, db, `operator_context_id = $1 AND field_actor_id = $2 AND status <> 'cancelled'`, operatorContextID, fieldActorID)
}

func list(ctx context.Context, db *sql.DB, where string, args ...any) ([]Assignment, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, operator_context_id, field_actor_id, business_task_key, store_name_hint,
		       COALESCE(phone_hint,''), COALESCE(address_hint,''), location_latitude,
		       location_longitude, status, priority, due_at, sla_minutes, COALESCE(draft_partner_id,''), version,
		       created_by_actor_id, created_at, updated_at
		FROM dsh_field_onboarding_assignments WHERE `+where+` ORDER BY updated_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Assignment, 0)
	for rows.Next() {
		var a Assignment
		if err := rows.Scan(&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.BusinessTaskKey, &a.StoreNameHint,
			&a.PhoneHint, &a.AddressHint, &a.LocationLatitude, &a.LocationLongitude,
			&a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes, &a.DraftPartnerID, &a.Version, &a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		applyDerived(&a)
		items = append(items, a)
	}
	return items, rows.Err()
}

func Open(ctx context.Context, db *sql.DB, operatorContextID, id, fieldActorID string, input TransitionInput) (Assignment, error) {
	return transition(ctx, db, operatorContextID, id, fieldActorID, input, StatusInProgress, "opened", false, "")
}

func Cancel(ctx context.Context, db *sql.DB, operatorContextID, id, actorID string, input TransitionInput) (Assignment, error) {
	return transition(ctx, db, operatorContextID, id, actorID, input, StatusCancelled, "cancelled", true, "")
}

func Reassign(ctx context.Context, db *sql.DB, operatorContextID, id, actorID string, input ReassignInput) (Assignment, error) {
	if err := validateReassign(StatusAssigned, input); err != nil {
		return Assignment{}, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Assignment{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	var previousFieldActorID string
	var previousStatus Status
	err = tx.QueryRowContext(ctx, `
		SELECT field_actor_id, status
		FROM dsh_field_onboarding_assignments
		WHERE id=$1 AND operator_context_id=$2 AND version=$3
		  AND status IN ('assigned','in_progress')
		FOR UPDATE`, id, operatorContextID, input.ExpectedVersion).Scan(&previousFieldActorID, &previousStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return Assignment{}, ErrVersionConflict
	}
	if err != nil {
		return Assignment{}, err
	}
	if err := validateReassign(previousStatus, input); err != nil {
		return Assignment{}, err
	}
	nextStatus := previousStatus
	eventType := "reassigned"
	if input.Handoff {
		nextStatus = StatusAssigned
		eventType = "handoff"
	}
	var a Assignment
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_field_onboarding_assignments
		SET field_actor_id=$3, status=$5, version=version+1, updated_at=NOW()
		WHERE id=$1 AND operator_context_id=$2 AND version=$4 AND status IN ('assigned','in_progress')
		RETURNING id, operator_context_id, field_actor_id, business_task_key, store_name_hint, COALESCE(phone_hint,''),
		          COALESCE(address_hint,''), location_latitude, location_longitude, status, priority, due_at, sla_minutes,
		          COALESCE(draft_partner_id,''), version, created_by_actor_id, created_at, updated_at`,
		id, operatorContextID, strings.TrimSpace(input.FieldActorID), input.ExpectedVersion, string(nextStatus)).Scan(
		&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.BusinessTaskKey, &a.StoreNameHint, &a.PhoneHint, &a.AddressHint,
		&a.LocationLatitude, &a.LocationLongitude, &a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes, &a.DraftPartnerID, &a.Version,
		&a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Assignment{}, ErrVersionConflict
	}
	if err != nil {
		return Assignment{}, err
	}
	applyDerived(&a)
	if err := appendEvent(ctx, tx, a, eventType, string(previousStatus), string(a.Status), actorID, previousFieldActorID, a.FieldActorID, "", input.Reason); err != nil {
		return Assignment{}, err
	}
	if err := tx.Commit(); err != nil {
		return Assignment{}, err
	}
	return a, nil
}

func LinkDraft(ctx context.Context, db *sql.DB, operatorContextID, id, fieldActorID, partnerID string) (Assignment, error) {
	if strings.TrimSpace(partnerID) == "" {
		return Assignment{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Assignment{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	var a Assignment
	err = tx.QueryRowContext(ctx, `
		SELECT id, operator_context_id, field_actor_id, business_task_key, store_name_hint, COALESCE(phone_hint,''),
		       COALESCE(address_hint,''), location_latitude, location_longitude, status,
		       priority, due_at, sla_minutes, COALESCE(draft_partner_id,''), version, created_by_actor_id, created_at, updated_at
		FROM dsh_field_onboarding_assignments
		WHERE id=$1 AND operator_context_id=$2 AND field_actor_id=$3
		FOR UPDATE`, id, operatorContextID, fieldActorID).Scan(
		&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.BusinessTaskKey, &a.StoreNameHint, &a.PhoneHint, &a.AddressHint,
		&a.LocationLatitude, &a.LocationLongitude, &a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes, &a.DraftPartnerID, &a.Version,
		&a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Assignment{}, ErrInvalidTransition
	}
	if err != nil {
		return Assignment{}, err
	}
	if a.Status == StatusDraftLinked && a.DraftPartnerID == partnerID {
		if err := tx.Commit(); err != nil {
			return Assignment{}, err
		}
		return a, nil
	}
	if a.Status != StatusInProgress || a.DraftPartnerID != "" {
		return Assignment{}, ErrInvalidTransition
	}
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_field_onboarding_assignments
		SET status='draft_linked', draft_partner_id=$4, version=version+1, updated_at=NOW()
		WHERE id=$1 AND operator_context_id=$2 AND field_actor_id=$3
		  AND version=$5 AND status='in_progress' AND draft_partner_id IS NULL
		RETURNING id, operator_context_id, field_actor_id, business_task_key, store_name_hint, COALESCE(phone_hint,''),
		          COALESCE(address_hint,''), location_latitude, location_longitude, status, priority, due_at, sla_minutes,
		          COALESCE(draft_partner_id,''), version, created_by_actor_id, created_at, updated_at`,
		id, operatorContextID, fieldActorID, partnerID, a.Version).Scan(
		&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.BusinessTaskKey, &a.StoreNameHint, &a.PhoneHint, &a.AddressHint,
		&a.LocationLatitude, &a.LocationLongitude, &a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes, &a.DraftPartnerID, &a.Version,
		&a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Assignment{}, ErrInvalidTransition
	}
	if err != nil {
		return Assignment{}, err
	}
	applyDerived(&a)
	if err := appendEvent(ctx, tx, a, "draft_linked", string(StatusInProgress), string(StatusDraftLinked), fieldActorID, "", fieldActorID, partnerID, ""); err != nil {
		return Assignment{}, err
	}
	if err := tx.Commit(); err != nil {
		return Assignment{}, err
	}
	return a, nil
}

func transition(ctx context.Context, db *sql.DB, operatorContextID, id, actorID string, input TransitionInput, next Status, event string, operatorOnly bool, draftID string) (Assignment, error) {
	if input.ExpectedVersion <= 0 {
		return Assignment{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Assignment{}, err
	}
	defer tx.Rollback() //nolint:errcheck
	var a Assignment
	var previousStatus Status
	allowedStatuses := "status IN ('assigned','in_progress')"
	if next == StatusInProgress {
		allowedStatuses = "status='assigned'"
	}
	where := "id=$1 AND operator_context_id=$2 AND version=$3 AND " + allowedStatuses
	if !operatorOnly {
		where += " AND field_actor_id=$4"
	}
	args := []any{id, operatorContextID, input.ExpectedVersion}
	if !operatorOnly {
		args = append(args, actorID)
	}
	if err := tx.QueryRowContext(ctx, `SELECT status FROM dsh_field_onboarding_assignments WHERE `+where+` FOR UPDATE`, args...).Scan(&previousStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Assignment{}, ErrVersionConflict
		}
		return Assignment{}, err
	}
	args = append(args, string(next))
	err = tx.QueryRowContext(ctx, `UPDATE dsh_field_onboarding_assignments SET status=$`+fmt.Sprint(len(args))+`, version=version+1, updated_at=NOW() WHERE `+where+` RETURNING id, operator_context_id, field_actor_id, business_task_key, store_name_hint, COALESCE(phone_hint,''), COALESCE(address_hint,''), location_latitude, location_longitude, status, priority, due_at, sla_minutes, COALESCE(draft_partner_id,''), version, created_by_actor_id, created_at, updated_at`, args...).Scan(
		&a.ID, &a.OperatorContextID, &a.FieldActorID, &a.BusinessTaskKey, &a.StoreNameHint, &a.PhoneHint, &a.AddressHint,
		&a.LocationLatitude, &a.LocationLongitude, &a.Status, &a.Priority, &a.DueAt, &a.SlaMinutes, &a.DraftPartnerID, &a.Version,
		&a.CreatedByActorID, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Assignment{}, ErrVersionConflict
	}
	if err != nil {
		return Assignment{}, err
	}
	applyDerived(&a)
	if err := appendEvent(ctx, tx, a, event, string(previousStatus), string(next), actorID, "", a.FieldActorID, draftID, input.Reason); err != nil {
		return Assignment{}, err
	}
	if err := tx.Commit(); err != nil {
		return Assignment{}, err
	}
	return a, nil
}

func appendEvent(ctx context.Context, tx *sql.Tx, a Assignment, event, from, to, actor, previous, next, draftID, reason string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_field_onboarding_assignment_events
			(assignment_id, operator_context_id, event_type, from_status, to_status, actor_id,
			 previous_field_actor_id, next_field_actor_id, draft_partner_id, reason)
		VALUES ($1,$2,$3,NULLIF($4,''),$5,$6,NULLIF($7,''),NULLIF($8,''),NULLIF($9,''),NULLIF($10,''))`,
		a.ID, a.OperatorContextID, event, from, to, actor, previous, next, draftID, reason)
	return err
}

func IsActive(status Status) bool { return status != StatusCancelled }
