package specialrequests

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound  = errors.New("special request not found")
	ErrInvalid   = errors.New("invalid special request input")
	ErrForbidden = errors.New("special request access forbidden")
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
	ID                       string
	ClientID                 string
	RequestType              RequestType
	Status                   RequestStatus
	CustomerNotes            *string
	Currency                 *string
	EstimatedAmountReference *string
	ProductUrl               *string
	Quantity                 *int
	Size                     *string
	Color                    *string
	VariantNotes             *string
	DeliveryAddressReference *string
	PickupAddressReference   *string
	DropoffAddressReference  *string
	ItemType                 *string
	ScheduleMode             *string
	ScheduledAt              *time.Time
	HandlingRequirements     *string
	AssignedOperatorID       *string
	DispatchAssignmentID     *string
	RejectionReason          *string
	CreatedAt                time.Time
	UpdatedAt                time.Time
	CompletedAt              *time.Time
	CancelledAt              *time.Time
}

type CreateInput struct {
	ClientID                 string
	RequestType              RequestType
	IdempotencyKey           string
	CustomerNotes            *string
	ProductUrl               *string
	Quantity                 *int
	Size                     *string
	Color                    *string
	VariantNotes             *string
	DeliveryAddressReference *string
	PickupAddressReference   *string
	DropoffAddressReference  *string
	ItemType                 *string
	ScheduleMode             *string
	ScheduledAt              *time.Time
	HandlingRequirements     *string
}

type UpdateInput struct {
	Status                   *RequestStatus
	AssignedOperatorID       *string
	RejectionReason          *string
	EstimatedAmountReference *string
	Currency                 *string
}

type Repository interface {
	Create(ctx context.Context, input CreateInput) (*SpecialRequest, error)
	Get(ctx context.Context, id string) (*SpecialRequest, error)
	Update(ctx context.Context, id string, input UpdateInput) (*SpecialRequest, error)
	ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error)
	ListForOperator(ctx context.Context, reqType *string, status *string, limit, offset int) ([]SpecialRequest, int, error)
}

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateInput) (*SpecialRequest, error) {
	id := uuid.New().String()
	query := `
		INSERT INTO dsh_special_requests (
			id, client_id, request_type, status, idempotency_key,
			customer_notes, product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, item_type, schedule_mode, scheduled_at, handling_requirements
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18
		)
		ON CONFLICT (client_id, idempotency_key) WHERE idempotency_key IS NOT NULL
		DO UPDATE SET updated_at = now()
		RETURNING 
			id, client_id, request_type, status,
			customer_notes, currency, estimated_amount_reference,
			product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, item_type, schedule_mode, scheduled_at, handling_requirements,
			assigned_operator_id, dispatch_assignment_id, rejection_reason,
			created_at, updated_at, completed_at, cancelled_at
	`
	var req SpecialRequest
	err := r.db.QueryRowContext(ctx, query,
		id, input.ClientID, input.RequestType, StatusSubmitted, input.IdempotencyKey,
		input.CustomerNotes, input.ProductUrl, input.Quantity, input.Size, input.Color, input.VariantNotes, input.DeliveryAddressReference,
		input.PickupAddressReference, input.DropoffAddressReference, input.ItemType, input.ScheduleMode, input.ScheduledAt, input.HandlingRequirements,
	).Scan(
		&req.ID, &req.ClientID, &req.RequestType, &req.Status,
		&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
	)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *PostgresRepository) Get(ctx context.Context, id string) (*SpecialRequest, error) {
	query := `
		SELECT 
			id, client_id, request_type, status,
			customer_notes, currency, estimated_amount_reference,
			product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, item_type, schedule_mode, scheduled_at, handling_requirements,
			assigned_operator_id, dispatch_assignment_id, rejection_reason,
			created_at, updated_at, completed_at, cancelled_at
		FROM dsh_special_requests
		WHERE id = $1
	`
	var req SpecialRequest
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&req.ID, &req.ClientID, &req.RequestType, &req.Status,
		&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, input UpdateInput) (*SpecialRequest, error) {
	query := `
		UPDATE dsh_special_requests
		SET 
			status = COALESCE($2, status),
			assigned_operator_id = COALESCE($3, assigned_operator_id),
			rejection_reason = COALESCE($4, rejection_reason),
			estimated_amount_reference = COALESCE($5, estimated_amount_reference),
			currency = COALESCE($6, currency),
			updated_at = now()
		WHERE id = $1
		RETURNING 
			id, client_id, request_type, status,
			customer_notes, currency, estimated_amount_reference,
			product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, item_type, schedule_mode, scheduled_at, handling_requirements,
			assigned_operator_id, dispatch_assignment_id, rejection_reason,
			created_at, updated_at, completed_at, cancelled_at
	`
	var req SpecialRequest
	err := r.db.QueryRowContext(ctx, query, id, input.Status, input.AssignedOperatorID, input.RejectionReason, input.EstimatedAmountReference, input.Currency).Scan(
		&req.ID, &req.ClientID, &req.RequestType, &req.Status,
		&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *PostgresRepository) ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	var total int
	err := r.db.QueryRowContext(ctx, "SELECT count(*) FROM dsh_special_requests WHERE client_id = $1", clientID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT 
			id, client_id, request_type, status,
			customer_notes, currency, estimated_amount_reference,
			product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, item_type, schedule_mode, scheduled_at, handling_requirements,
			assigned_operator_id, dispatch_assignment_id, rejection_reason,
			created_at, updated_at, completed_at, cancelled_at
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
		var req SpecialRequest
		if err := rows.Scan(
			&req.ID, &req.ClientID, &req.RequestType, &req.Status,
			&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference,
			&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
			&req.PickupAddressReference, &req.DropoffAddressReference, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
			&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
			&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
		); err != nil {
			return nil, 0, err
		}
		reqs = append(reqs, req)
	}
	return reqs, total, nil
}

func (r *PostgresRepository) ListForOperator(ctx context.Context, reqType *string, status *string, limit, offset int) ([]SpecialRequest, int, error) {
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

	countQuery := "SELECT count(*) FROM dsh_special_requests " + whereClause
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT 
			id, client_id, request_type, status,
			customer_notes, currency, estimated_amount_reference,
			product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, item_type, schedule_mode, scheduled_at, handling_requirements,
			assigned_operator_id, dispatch_assignment_id, rejection_reason,
			created_at, updated_at, completed_at, cancelled_at
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
		var req SpecialRequest
		if err := rows.Scan(
			&req.ID, &req.ClientID, &req.RequestType, &req.Status,
			&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference,
			&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
			&req.PickupAddressReference, &req.DropoffAddressReference, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
			&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
			&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
		); err != nil {
			return nil, 0, err
		}
		reqs = append(reqs, req)
	}
	return reqs, total, nil
}
