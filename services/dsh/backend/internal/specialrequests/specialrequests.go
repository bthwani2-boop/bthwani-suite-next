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
	TenantID                  string
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
	QuotePreparedAt           *time.Time
	CustomerApprovedAt        *time.Time
	PurchaseBatchID           *string
	PurchasedAt               *time.Time
	InboundReference          *string
	InboundReceivedAt         *time.Time
	SortingStartedAt          *time.Time
	SortingCompletedAt        *time.Time
	FulfillmentPreparedAt     *time.Time
	ReadyForDeliveryAt        *time.Time
	CaptainAssignedAt         *time.Time
	PickedUpAt                *time.Time
	DeliveredAt               *time.Time
}

type CreateInput struct {
	TenantID                 string
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

	QuotePreparedAt       *time.Time
	CustomerApprovedAt    *time.Time
	PurchaseBatchID       *string
	PurchasedAt           *time.Time
	InboundReference      *string
	InboundReceivedAt     *time.Time
	SortingStartedAt      *time.Time
	SortingCompletedAt    *time.Time
	FulfillmentPreparedAt *time.Time
	ReadyForDeliveryAt    *time.Time
	CaptainAssignedAt     *time.Time
	PickedUpAt            *time.Time
	DeliveredAt           *time.Time

	// setCompletedAt / setCancelledAt are computed by the service layer from
	// the requested status transition; the repository only ever reads them,
	// it never derives them from Status itself.
	setCompletedAt bool
	setCancelledAt bool
}

type Repository interface {
	Create(ctx context.Context, input CreateInput) (*SpecialRequest, error)
	Get(ctx context.Context, id string) (*SpecialRequest, error)
	GetInTenant(ctx context.Context, tenantID string, id string) (*SpecialRequest, error)
	Update(ctx context.Context, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error)
	UpdateInTenant(ctx context.Context, tenantID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error)
	ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error)
	ListByClientInTenant(ctx context.Context, tenantID string, clientID string, limit, offset int) ([]SpecialRequest, int, error)
	ListForOperator(ctx context.Context, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error)
	ListForOperatorInTenant(ctx context.Context, tenantID string, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error)
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
	tenant_id,
	customer_notes, currency, estimated_amount_reference, estimated_amount_minor_units, wlt_payment_session_id, correlation_id,
	product_url, quantity, size, color, variant_notes, delivery_address_reference,
	pickup_address_reference, dropoff_address_reference, pickup_location, dropoff_location, item_type, schedule_mode, scheduled_at, handling_requirements,
	assigned_operator_id, dispatch_assignment_id, rejection_reason,
	created_at, updated_at, completed_at, cancelled_at,
	quote_prepared_at, customer_approved_at, purchase_batch_id, purchased_at,
	inbound_reference, inbound_received_at, sorting_started_at, sorting_completed_at,
	fulfillment_prepared_at, ready_for_delivery_at, captain_assigned_at, picked_up_at, delivered_at
`

func scanSpecialRequest(scan func(...any) error) (*SpecialRequest, error) {
	var req SpecialRequest
	err := scan(
		&req.ID, &req.ClientID, &req.RequestType, &req.Status, &req.Version, &req.WorkflowStage,
		&req.TenantID,
		&req.CustomerNotes, &req.Currency, &req.EstimatedAmountReference, &req.EstimatedAmountMinorUnits, &req.WltPaymentSessionID, &req.CorrelationID,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.PickupLocation, &req.DropoffLocation, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
		&req.QuotePreparedAt, &req.CustomerApprovedAt, &req.PurchaseBatchID, &req.PurchasedAt,
		&req.InboundReference, &req.InboundReceivedAt, &req.SortingStartedAt, &req.SortingCompletedAt,
		&req.FulfillmentPreparedAt, &req.ReadyForDeliveryAt, &req.CaptainAssignedAt, &req.PickedUpAt, &req.DeliveredAt,
	)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

// queryRower is satisfied by both *sql.DB and *sql.Tx, letting Create/update
// run against either a pooled connection or a caller-owned transaction. The
// Tx variants exist so a mutation and the audit event describing it (see
// service.go's Create/ApplyOperatorTransitionInTenant/
// CancelForClientInTenant) commit or roll back together.
type queryRower interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateInput) (*SpecialRequest, error) {
	return r.createWith(ctx, r.db, input)
}

// CreateTx is Create's transactional counterpart.
func (r *PostgresRepository) CreateTx(ctx context.Context, tx *sql.Tx, input CreateInput) (*SpecialRequest, error) {
	return r.createWith(ctx, tx, input)
}

func (r *PostgresRepository) createWith(ctx context.Context, exec queryRower, input CreateInput) (*SpecialRequest, error) {
	if input.TenantID == "" {
		input.TenantID = DefaultTenantID
	}
	id := uuid.New().String()
	query := `
		INSERT INTO dsh_special_requests (
			id, tenant_id, client_id, request_type, status, idempotency_key, workflow_stage, correlation_id,
			customer_notes, product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, pickup_location, dropoff_location, item_type, schedule_mode, scheduled_at, handling_requirements
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18::jsonb, $19::jsonb, $20, $21, $22, $23
		)
		ON CONFLICT (tenant_id, client_id, idempotency_key) WHERE idempotency_key IS NOT NULL
		DO UPDATE SET updated_at = now()
		RETURNING ` + specialRequestColumns

	row := exec.QueryRowContext(ctx, query,
		id, input.TenantID, input.ClientID, input.RequestType, StatusSubmitted, input.IdempotencyKey, input.workflowStage, input.CorrelationID,
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

func (r *PostgresRepository) GetInTenant(ctx context.Context, tenantID string, id string) (*SpecialRequest, error) {
	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE tenant_id = $1 AND id = $2
	`
	req, err := scanSpecialRequest(r.db.QueryRowContext(ctx, query, tenantID, id).Scan)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (r *PostgresRepository) Update(ctx context.Context, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	return r.updateWith(ctx, r.db, "", id, expectedVersion, input)
}

func (r *PostgresRepository) UpdateInTenant(ctx context.Context, tenantID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	return r.updateWith(ctx, r.db, tenantID, id, expectedVersion, input)
}

// UpdateInTenantTx is UpdateInTenant's transactional counterpart.
func (r *PostgresRepository) UpdateInTenantTx(ctx context.Context, tx *sql.Tx, tenantID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	return r.updateWith(ctx, tx, tenantID, id, expectedVersion, input)
}

func (r *PostgresRepository) updateWith(ctx context.Context, exec queryRower, tenantID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	where := "id = $1 AND version = $2"
	args := []any{
		id, expectedVersion, input.Status, input.WorkflowStage, input.AssignedOperatorID, input.RejectionReason,
		input.EstimatedAmountMinorUnits, input.Currency, input.WltPaymentSessionID,
		input.setCompletedAt, input.setCancelledAt,
		input.QuotePreparedAt, input.CustomerApprovedAt, input.PurchaseBatchID, input.PurchasedAt,
		input.InboundReference, input.InboundReceivedAt, input.SortingStartedAt, input.SortingCompletedAt,
		input.FulfillmentPreparedAt, input.ReadyForDeliveryAt, input.CaptainAssignedAt, input.PickedUpAt, input.DeliveredAt,
	}
	if tenantID != "" {
		where = "tenant_id = $25 AND id = $1 AND version = $2"
		args = append(args, tenantID)
	}
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
			quote_prepared_at = COALESCE($12, quote_prepared_at),
			customer_approved_at = COALESCE($13, customer_approved_at),
			purchase_batch_id = COALESCE($14, purchase_batch_id),
			purchased_at = COALESCE($15, purchased_at),
			inbound_reference = COALESCE($16, inbound_reference),
			inbound_received_at = COALESCE($17, inbound_received_at),
			sorting_started_at = COALESCE($18, sorting_started_at),
			sorting_completed_at = COALESCE($19, sorting_completed_at),
			fulfillment_prepared_at = COALESCE($20, fulfillment_prepared_at),
			ready_for_delivery_at = COALESCE($21, ready_for_delivery_at),
			captain_assigned_at = COALESCE($22, captain_assigned_at),
			picked_up_at = COALESCE($23, picked_up_at),
			delivered_at = COALESCE($24, delivered_at),
			version = version + 1,
			updated_at = now(),
			completed_at = CASE WHEN $10 THEN now() ELSE completed_at END,
			cancelled_at = CASE WHEN $11 THEN now() ELSE cancelled_at END
		WHERE ` + where + `
		RETURNING ` + specialRequestColumns

	row := exec.QueryRowContext(ctx, query, args...)
	req, err := scanSpecialRequest(row.Scan)
	if err == sql.ErrNoRows {
		var currentVersion int
		versionQuery := `SELECT version FROM dsh_special_requests WHERE id = $1`
		versionArgs := []any{id}
		if tenantID != "" {
			versionQuery = `SELECT version FROM dsh_special_requests WHERE tenant_id = $1 AND id = $2`
			versionArgs = []any{tenantID, id}
		}
		verErr := exec.QueryRowContext(ctx, versionQuery, versionArgs...).Scan(&currentVersion)
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
// must not reach into per this phase's scope. Keeping status as the sole
// driver handles the base use case without complex cross-module coupling. Mappings
// stage sync for dispatch-driven transitions can follow in a later phase.
func TransitionDispatchStatus(tx *sql.Tx, id string, allowedFrom []RequestStatus, toStatus RequestStatus) error {
	return TransitionDispatchStatusInTenant(tx, "", id, allowedFrom, toStatus)
}

func TransitionDispatchStatusInTenant(tx *sql.Tx, tenantID string, id string, allowedFrom []RequestStatus, toStatus RequestStatus) error {
	var currentStatus RequestStatus
	var version int
	query := `SELECT status, version FROM dsh_special_requests WHERE id = $1 FOR UPDATE`
	args := []any{id}
	if tenantID != "" {
		query = `SELECT status, version FROM dsh_special_requests WHERE tenant_id = $1 AND id = $2 FOR UPDATE`
		args = []any{tenantID, id}
	}
	err := tx.QueryRow(query, args...).Scan(&currentStatus, &version)
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

	updateQuery := `
		UPDATE dsh_special_requests
		SET status = $1, version = version + 1, updated_at = now(),
		    completed_at = CASE WHEN $2 THEN now() ELSE completed_at END,
		    cancelled_at = CASE WHEN $3 THEN now() ELSE cancelled_at END
		WHERE id = $4`
	updateArgs := []any{string(toStatus), setCompletedAt, setCancelledAt, id}
	if tenantID != "" {
		updateQuery += ` AND tenant_id = $5`
		updateArgs = append(updateArgs, tenantID)
	}
	_, err = tx.Exec(updateQuery, updateArgs...)
	return err
}

// ErrNotReadyForDispatch is the sentinel a caller can match against (via
// errors.As) to recover the structured DispatchReadiness detail from
// CheckSheinDispatchReadiness's rejection.
var ErrNotReadyForDispatch = errors.New("special request is not ready for dispatch")

// DispatchReadiness explains why a SHEIN_ASSISTED_PURCHASE special request
// cannot yet be dispatched to a captain, mirroring the
// SPECIAL_REQUEST_NOT_READY_FOR_DISPATCH error shape the governing operational
// journey protocol requires (governance/operational_journey_protocol_package,
// SHEIN dispatch-readiness gate).
type DispatchReadiness struct {
	CurrentStage    string
	RequiredStage   string
	BlockingReasons []string
}

// ErrDispatchNotReady wraps ErrNotReadyForDispatch with the structured detail
// HTTP handlers need to shape a SPECIAL_REQUEST_NOT_READY_FOR_DISPATCH
// response (currentStage/requiredStage/blockingReasons).
type ErrDispatchNotReady struct {
	Readiness DispatchReadiness
}

func (e *ErrDispatchNotReady) Error() string {
	return fmt.Sprintf("%v: current stage %q, requires %q", ErrNotReadyForDispatch, e.Readiness.CurrentStage, e.Readiness.RequiredStage)
}

func (e *ErrDispatchNotReady) Unwrap() error { return ErrNotReadyForDispatch }

// CheckSheinDispatchReadiness locks and validates that a SHEIN_ASSISTED_PURCHASE
// special request has actually reached workflow_stage "ready_for_delivery"
// with every prerequisite fulfillment timestamp populated, before it may be
// dispatched to a captain.
//
// This exists because RequestStatus alone is not a sufficient readiness
// signal for SHEIN: per sheinStageRules, status stays "approved" across five
// different stages (batch_pending, purchased, inbound, sorting,
// ready_for_delivery). A caller that only checks status == approved (as
// dispatch.CreateAssignmentForSpecialRequest did before this function was
// introduced) can dispatch a captain to a request that has not even been
// purchased yet. AWNAK_ERRAND does not have this gap -- only dispatch_pending
// maps to StatusApproved for that request type -- so this check is a no-op
// for it.
//
// It must be called inside the same transaction that will perform the
// dispatch assignment (immediately before TransitionDispatchStatusInTenant),
// so the readiness check and the resulting status transition are atomic
// together: locking here and re-locking in TransitionDispatchStatusInTenant
// within the same tx is safe (Postgres row locks are reentrant within a
// transaction).
func CheckSheinDispatchReadiness(tx *sql.Tx, tenantID, id string) error {
	query := `SELECT request_type, workflow_stage, purchased_at, inbound_received_at,
		sorting_completed_at, fulfillment_prepared_at, ready_for_delivery_at
		FROM dsh_special_requests WHERE id = $1 FOR UPDATE`
	args := []any{id}
	if tenantID != "" {
		query = `SELECT request_type, workflow_stage, purchased_at, inbound_received_at,
			sorting_completed_at, fulfillment_prepared_at, ready_for_delivery_at
			FROM dsh_special_requests WHERE tenant_id = $1 AND id = $2 FOR UPDATE`
		args = []any{tenantID, id}
	}

	var (
		requestType           RequestType
		workflowStage         *string
		purchasedAt           *time.Time
		inboundReceivedAt     *time.Time
		sortingCompletedAt    *time.Time
		fulfillmentPreparedAt *time.Time
		readyForDeliveryAt    *time.Time
	)
	err := tx.QueryRow(query, args...).Scan(&requestType, &workflowStage, &purchasedAt, &inboundReceivedAt,
		&sortingCompletedAt, &fulfillmentPreparedAt, &readyForDeliveryAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	if requestType != TypeSheinAssistedPurchase {
		return nil
	}

	stage := ""
	if workflowStage != nil {
		stage = *workflowStage
	}
	if stage == "ready_for_delivery" {
		return nil
	}

	var reasons []string
	if purchasedAt == nil {
		reasons = append(reasons, "NOT_PURCHASED")
	}
	if inboundReceivedAt == nil {
		reasons = append(reasons, "INBOUND_NOT_RECEIVED")
	}
	if sortingCompletedAt == nil {
		reasons = append(reasons, "SORTING_NOT_COMPLETED")
	}
	if fulfillmentPreparedAt == nil {
		reasons = append(reasons, "FULFILLMENT_NOT_PREPARED")
	}
	if readyForDeliveryAt == nil {
		reasons = append(reasons, "NOT_READY_FOR_DELIVERY")
	}
	if len(reasons) == 0 {
		// Every readiness timestamp is set but workflow_stage still isn't
		// "ready_for_delivery" -- treat the stage mismatch itself as the
		// blocking reason so this can never silently pass.
		reasons = append(reasons, "WORKFLOW_STAGE_NOT_READY_FOR_DELIVERY")
	}

	return &ErrDispatchNotReady{Readiness: DispatchReadiness{
		CurrentStage:    stage,
		RequiredStage:   "ready_for_delivery",
		BlockingReasons: reasons,
	}}
}

func (r *PostgresRepository) ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	return r.ListByClientInTenant(ctx, DefaultTenantID, clientID, limit, offset)
}

func (r *PostgresRepository) ListByClientInTenant(ctx context.Context, tenantID string, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	limit = clampLimit(limit)

	var total int
	err := r.db.QueryRowContext(ctx, "SELECT count(*) FROM dsh_special_requests WHERE tenant_id = $1 AND client_id = $2", tenantID, clientID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE tenant_id = $1 AND client_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.db.QueryContext(ctx, query, tenantID, clientID, limit, offset)
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
	return r.ListForOperatorInTenant(ctx, DefaultTenantID, reqType, status, workflowStage, limit, offset)
}

func (r *PostgresRepository) ListForOperatorInTenant(ctx context.Context, tenantID string, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error) {
	limit = clampLimit(limit)

	whereClause := "WHERE tenant_id = $1"
	var args []interface{} = []interface{}{tenantID}
	argIdx := 2
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
