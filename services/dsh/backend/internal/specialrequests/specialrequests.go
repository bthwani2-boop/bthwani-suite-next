package specialrequests

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound        = errors.New("special request not found")
	ErrInvalid         = errors.New("invalid special request input")
	ErrForbidden       = errors.New("special request access forbidden")
	ErrConflict        = errors.New("special request state conflict")
	ErrVersionConflict = errors.New("special request version conflict")
)

type RequestType string
type RequestStatus string

const (
	TypeSheinAssistedPurchase RequestType = "SHEIN_ASSISTED_PURCHASE"
	TypeAwnakErrand           RequestType = "AWNAK_ERRAND"

	StatusSubmitted          RequestStatus = "submitted"
	StatusUnderReview        RequestStatus = "under_review"
	StatusNeedsCustomerInput RequestStatus = "needs_customer_input"
	StatusApproved           RequestStatus = "approved"
	StatusAssigned           RequestStatus = "assigned"
	StatusInProgress         RequestStatus = "in_progress"
	StatusCompleted          RequestStatus = "completed"
	StatusCancelled          RequestStatus = "cancelled"
	StatusRejected           RequestStatus = "rejected"
)

type SpecialRequest struct {
	ID                        string
	ClientID                  string
	RequestType               RequestType
	Status                    RequestStatus
	Version                   int
	WorkflowStage             *string
	CustomerNotes             *string
	Currency                  *string
	EstimatedAmountReference  *string // deprecated: use EstimatedAmountMinorUnits
	EstimatedAmountMinorUnits *int64
	WltPaymentSessionID       *string
	CorrelationID             *string
	ProductUrl                *string
	Quantity                  *int
	Size                      *string
	Color                     *string
	VariantNotes              *string
	DeliveryAddressReference  *string
	PickupAddressReference    *string
	DropoffAddressReference   *string
	PickupLocation            *json.RawMessage
	DropoffLocation           *json.RawMessage
	ItemType                  *string
	ScheduleMode              *string
	ScheduledAt               *time.Time
	HandlingRequirements      *string
	AssignedOperatorID        *string
	DispatchAssignmentID      *string
	RejectionReason           *string
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
	CompletedAt               *time.Time
	CancelledAt               *time.Time
}

type CreateInput struct {
	ClientID                 string
	RequestType              RequestType
	IdempotencyKey           string
	CorrelationID            *string
	CustomerNotes            *string
	ProductUrl               *string
	Quantity                 *int
	Size                     *string
	Color                    *string
	VariantNotes             *string
	DeliveryAddressReference *string
	PickupAddressReference   *string
	DropoffAddressReference  *string
	PickupLocation           json.RawMessage
	DropoffLocation          json.RawMessage
	ItemType                 *string
	ScheduleMode             *string
	ScheduledAt              *time.Time
	HandlingRequirements     *string

	// workflowStage is derived by the service layer, not accepted from callers.
	workflowStage *string
}

type UpdateInput struct {
	Status                    *RequestStatus
	WorkflowStage             *string
	AssignedOperatorID        *string
	RejectionReason           *string
	EstimatedAmountMinorUnits *int64
	Currency                  *string
	WltPaymentSessionID       *string

	// setCompletedAt / setCancelledAt are computed by the service layer from
	// the requested status transition; the repository only ever reads them,
	// it never derives them from Status itself.
	setCompletedAt bool
	setCancelledAt bool
}

type Repository interface {
	Create(ctx context.Context, input CreateInput) (*SpecialRequest, error)
	Get(ctx context.Context, id string) (*SpecialRequest, error)
	Update(ctx context.Context, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error)
	ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error)
	ListForOperator(ctx context.Context, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error)
}

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) DB() *sql.DB {
	return r.db
}

func nullableJSON(raw json.RawMessage) interface{} {
	if len(raw) == 0 {
		return nil
	}
	return string(raw)
}

func clampLimit(limit int) int {
	if limit <= 0 || limit > 200 {
		return 50
	}
	return limit
}

const specialRequestColumns = `
	id, client_id, request_type, status, version, workflow_stage,
	customer_notes, currency, estimated_amount_reference, estimated_amount_minor_units, wlt_payment_session_id, correlation_id,
	product_url, quantity, size, color, variant_notes, delivery_address_reference,
	pickup_address_reference, dropoff_address_reference, pickup_location, dropoff_location, item_type, schedule_mode, scheduled_at, handling_requirements,
	assigned_operator_id, dispatch_assignment_id, rejection_reason,
	created_at, updated_at, completed_at, cancelled_at
`

func scanSpecialRequest(scan func(...any) error) (*SpecialRequest, error) {
	var req SpecialRequest
	err := scan(
		&req.ID, &req.ClientID, &req.RequestType, &req.Status, &req.Version, &req.WorkflowStage,
		&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference, &req.EstimatedAmountMinorUnits, &req.WltPaymentSessionID, &req.CorrelationID,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.PickupLocation, &req.DropoffLocation, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
	)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateInput) (*SpecialRequest, error) {
	id := uuid.New().String()
	query := `
		INSERT INTO dsh_special_requests (
			id, client_id, request_type, status, idempotency_key, workflow_stage, correlation_id,
			customer_notes, product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, pickup_location, dropoff_location, item_type, schedule_mode, scheduled_at, handling_requirements
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17::jsonb, $18::jsonb, $19, $20, $21, $22
		)
		ON CONFLICT (client_id, idempotency_key) WHERE idempotency_key IS NOT NULL
		DO UPDATE SET updated_at = now()
		RETURNING ` + specialRequestColumns

	row := r.db.QueryRowContext(ctx, query,
		id, input.ClientID, input.RequestType, StatusSubmitted, input.IdempotencyKey, input.workflowStage, input.CorrelationID,
		input.CustomerNotes, input.ProductUrl, input.Quantity, input.Size, input.Color, input.VariantNotes, input.DeliveryAddressReference,
		input.PickupAddressReference, input.DropoffAddressReference, nullableJSON(input.PickupLocation), nullableJSON(input.DropoffLocation), input.ItemType, input.ScheduleMode, input.ScheduledAt, input.HandlingRequirements,
	)
	return scanSpecialRequest(row.Scan)
}

func (r *PostgresRepository) Get(ctx context.Context, id string) (*SpecialRequest, error) {
	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE id = $1
	`
	req, err := scanSpecialRequest(r.db.QueryRowContext(ctx, query, id).Scan)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	query := `
		UPDATE dsh_special_requests
		SET
			status = COALESCE($3, status),
			workflow_stage = COALESCE($4, workflow_stage),
			assigned_operator_id = COALESCE($5, assigned_operator_id),
			rejection_reason = COALESCE($6, rejection_reason),
			estimated_amount_minor_units = COALESCE($7, estimated_amount_minor_units),
			currency = COALESCE($8, currency),
			wlt_payment_session_id = COALESCE($9, wlt_payment_session_id),
			version = version + 1,
			updated_at = now(),
			completed_at = CASE WHEN $10 THEN now() ELSE completed_at END,
			cancelled_at = CASE WHEN $11 THEN now() ELSE cancelled_at END
		WHERE id = $1 AND version = $2
		RETURNING ` + specialRequestColumns

	row := r.db.QueryRowContext(ctx, query,
		id, expectedVersion, input.Status, input.WorkflowStage, input.AssignedOperatorID, input.RejectionReason,
		input.EstimatedAmountMinorUnits, input.Currency, input.WltPaymentSessionID,
		input.setCompletedAt, input.setCancelledAt,
	)
	req, err := scanSpecialRequest(row.Scan)
	if err == sql.ErrNoRows {
		var currentVersion int
		verErr := r.db.QueryRowContext(ctx, `SELECT version FROM dsh_special_requests WHERE id = $1`, id).Scan(&currentVersion)
		if verErr == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		if verErr != nil {
			return nil, verErr
		}
		return nil, ErrVersionConflict
	}
	if err != nil {
		return nil, err
	}
	return req, nil
}

// TransitionDispatchStatus is the dispatch-side counterpart to Update: it
// runs inside a caller-owned transaction (dispatch.go's assignment/delivery
// mutations) rather than opening its own, so a special request's status
// transition commits atomically with the dispatch assignment/delivery write
// that triggered it. It locks the row, validates the current status is one
// of allowedFrom, and moves it to toStatus.
//
// It deliberately does not touch workflow_stage: workflow_stage is owned by
// the operator PATCH flow (ApplyOperatorTransition / service.go's
// defaultStageFor-style mapping), which this function's caller (dispatch.go)
// must not reach into per this slice's scope. Keeping status as the sole
// source of truth here avoids duplicating or drifting from that mapping;
// stage sync for dispatch-driven transitions can follow in a later slice.
func TransitionDispatchStatus(tx *sql.Tx, id string, allowedFrom []RequestStatus, toStatus RequestStatus) error {
	var currentStatus RequestStatus
	var version int
	err := tx.QueryRow(`SELECT status, version FROM dsh_special_requests WHERE id = $1 FOR UPDATE`, id).Scan(&currentStatus, &version)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	validFrom := false
	for _, s := range allowedFrom {
		if currentStatus == s {
			validFrom = true
			break
		}
	}
	if !validFrom {
		return fmt.Errorf("%w: cannot transition special request from %s to %s", ErrConflict, currentStatus, toStatus)
	}

	setCompletedAt := toStatus == StatusCompleted
	setCancelledAt := toStatus == StatusCancelled

	_, err = tx.Exec(`
		UPDATE dsh_special_requests
		SET status = $1, version = version + 1, updated_at = now(),
		    completed_at = CASE WHEN $2 THEN now() ELSE completed_at END,
		    cancelled_at = CASE WHEN $3 THEN now() ELSE cancelled_at END
		WHERE id = $4`,
		string(toStatus), setCompletedAt, setCancelledAt, id)
	return err
}

func (r *PostgresRepository) ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	limit = clampLimit(limit)

	var total int
	err := r.db.QueryRowContext(ctx, "SELECT count(*) FROM dsh_special_requests WHERE client_id = $1", clientID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE client_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.QueryContext(ctx, query, clientID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reqs []SpecialRequest
	for rows.Next() {
		req, err := scanSpecialRequest(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		reqs = append(reqs, *req)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return reqs, total, nil
}

func (r *PostgresRepository) ListForOperator(ctx context.Context, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error) {
	limit = clampLimit(limit)

	whereClause := "WHERE 1=1"
	var args []interface{}
	argIdx := 1
	if reqType != nil && *reqType != "" {
		whereClause += fmt.Sprintf(" AND request_type = $%d", argIdx)
		args = append(args, *reqType)
		argIdx++
	}
	if status != nil && *status != "" {
		whereClause += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, *status)
		argIdx++
	}
	if workflowStage != nil && *workflowStage != "" {
		whereClause += fmt.Sprintf(" AND workflow_stage = $%d", argIdx)
		args = append(args, *workflowStage)
		argIdx++
	}

	countQuery := "SELECT count(*) FROM dsh_special_requests " + whereClause
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		` + whereClause + `
		ORDER BY created_at DESC
		LIMIT $` + fmt.Sprint(argIdx) + ` OFFSET $` + fmt.Sprint(argIdx+1)

	args = append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reqs []SpecialRequest
	for rows.Next() {
		req, err := scanSpecialRequest(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		reqs = append(reqs, *req)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return reqs, total, nil
}
