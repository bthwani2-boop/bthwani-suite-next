package specialrequests

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/operationaloutbox"
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
	ID                       string
	OperatorContextID        string
	ClientID                 string
	RequestType              RequestType
	Status                   RequestStatus
	Version                  int
	WorkflowStage            *string
	CustomerNotes            *string
	WltQuoteID               *string
	WltQuotePolicyID         *string
	WltQuotePolicyVersion    *int
	WltQuoteVersion          *int
	WltQuoteAmountMinorUnits *int64
	WltQuoteCurrency         *string
	WltQuoteHash             *string
	WltQuoteExpiresAt        *time.Time
	WltPaymentSessionID      *string
	LastWltStatus            *string
	LastWltEventAt           *time.Time
	CorrelationID            *string
	ProductUrl               *string
	Quantity                 *int
	Size                     *string
	Color                    *string
	VariantNotes             *string
	DeliveryAddressReference *string
	PickupAddressReference   *string
	DropoffAddressReference  *string
	PickupLocation           *json.RawMessage
	DropoffLocation          *json.RawMessage
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
	WltQuoteIssuedAt         *time.Time
	CustomerApprovedAt       *time.Time
	PurchaseBatchID          *string
	PurchasedAt              *time.Time
	InboundReference         *string
	InboundReceivedAt        *time.Time
	SortingStartedAt         *time.Time
	SortingCompletedAt       *time.Time
	FulfillmentPreparedAt    *time.Time
	ReadyForDeliveryAt       *time.Time
	CaptainAssignedAt        *time.Time
	PickedUpAt               *time.Time
	DeliveredAt              *time.Time

	// J059 Extensions
	MediaID         *string
	SafetyStatus    *string
	ModerationNote  *string
	IsUnsafeContent bool
}

type CreateInput struct {
	OperatorContextID        string
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

	// J059 Extensions
	MediaID *string
}

type UpdateInput struct {
	// ActorID is used only for audit attribution and must come from the
	// authenticated actor context at the HTTP boundary.
	ActorID string
	// QuoteProposalRequested marks the governed operator quote command. It is
	// intentionally not a lifecycle field: the HTTP boundary sets it only
	// when the complete WLT quote proposal payload is present, allowing a
	// failed WLT handoff to be retried at customer_approval without reopening
	// a generic same-status transition path.
	QuoteProposalRequested bool
	Status                 *RequestStatus
	WorkflowStage          *string
	AssignedOperatorID     *string
	RejectionReason        *string
	WltPaymentSessionID    *string

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

	// J059 Extensions
	SafetyStatus    *string
	ModerationNote  *string
	IsUnsafeContent *bool

	// These fields are populated only by the WLT readback attachment method;
	// ordinary operator transitions cannot write financial projections.
	wltQuoteID               *string
	wltQuotePolicyID         *string
	wltQuotePolicyVersion    *int
	wltQuoteVersion          *int
	wltQuoteAmountMinorUnits *int64
	wltQuoteCurrency         *string
	wltQuoteHash             *string
	wltQuoteExpiresAt        *time.Time
	quotePreparedAt          *time.Time
	lastWltStatus            *string
	lastWltEventAt           *time.Time
}

type Repository interface {
	Create(ctx context.Context, input CreateInput) (*SpecialRequest, error)
	Get(ctx context.Context, id string) (*SpecialRequest, error)
	GetInOperatorContext(ctx context.Context, operatorContextID string, id string) (*SpecialRequest, error)
	Update(ctx context.Context, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error)
	UpdateInOperatorContext(ctx context.Context, operatorContextID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error)
	ListByClient(ctx context.Context, clientID string, limit, offset int) ([]SpecialRequest, int, error)
	ListByClientInOperatorContext(ctx context.Context, operatorContextID string, clientID string, limit, offset int) ([]SpecialRequest, int, error)
	ListForOperator(ctx context.Context, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error)
	ListForOperatorInOperatorContext(ctx context.Context, operatorContextID string, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error)
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
	operator_context_id,
	customer_notes, wlt_quote_id, wlt_quote_policy_id, wlt_quote_policy_version, wlt_quote_version,
	wlt_quote_amount_minor_units, wlt_quote_currency, wlt_quote_hash, wlt_quote_expires_at,
	wlt_payment_session_id, correlation_id, last_wlt_status, last_wlt_event_at,
	product_url, quantity, size, color, variant_notes, delivery_address_reference,
	pickup_address_reference, dropoff_address_reference, pickup_location, dropoff_location, item_type, schedule_mode, scheduled_at, handling_requirements,
	assigned_operator_id, dispatch_assignment_id, rejection_reason,
	created_at, updated_at, completed_at, cancelled_at,
	quote_prepared_at, customer_approved_at, purchase_batch_id, purchased_at,
	inbound_reference, inbound_received_at, sorting_started_at, sorting_completed_at,
	fulfillment_prepared_at, ready_for_delivery_at, captain_assigned_at, picked_up_at, delivered_at,
	media_id, safety_status, moderation_note, is_unsafe_content
`

func scanSpecialRequest(scan func(...any) error) (*SpecialRequest, error) {
	var req SpecialRequest
	err := scan(
		&req.ID, &req.ClientID, &req.RequestType, &req.Status, &req.Version, &req.WorkflowStage,
		&req.OperatorContextID,
		&req.CustomerNotes, &req.WltQuoteID, &req.WltQuotePolicyID, &req.WltQuotePolicyVersion, &req.WltQuoteVersion,
		&req.WltQuoteAmountMinorUnits, &req.WltQuoteCurrency, &req.WltQuoteHash, &req.WltQuoteExpiresAt,
		&req.WltPaymentSessionID, &req.CorrelationID, &req.LastWltStatus, &req.LastWltEventAt,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.PickupLocation, &req.DropoffLocation, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
		&req.WltQuoteIssuedAt, &req.CustomerApprovedAt, &req.PurchaseBatchID, &req.PurchasedAt,
		&req.InboundReference, &req.InboundReceivedAt, &req.SortingStartedAt, &req.SortingCompletedAt,
		&req.FulfillmentPreparedAt, &req.ReadyForDeliveryAt, &req.CaptainAssignedAt, &req.PickedUpAt, &req.DeliveredAt,
		&req.MediaID, &req.SafetyStatus, &req.ModerationNote, &req.IsUnsafeContent,
	)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func scanSpecialRequestWithCreated(scan func(...any) error) (*SpecialRequest, bool, error) {
	var req SpecialRequest
	created := false
	targets := []any{
		&req.ID, &req.ClientID, &req.RequestType, &req.Status, &req.Version, &req.WorkflowStage,
		&req.OperatorContextID,
		&req.CustomerNotes, &req.WltQuoteID, &req.WltQuotePolicyID, &req.WltQuotePolicyVersion, &req.WltQuoteVersion,
		&req.WltQuoteAmountMinorUnits, &req.WltQuoteCurrency, &req.WltQuoteHash, &req.WltQuoteExpiresAt,
		&req.WltPaymentSessionID, &req.CorrelationID, &req.LastWltStatus, &req.LastWltEventAt,
		&req.ProductUrl, &req.Quantity, &req.Size, &req.Color, &req.VariantNotes, &req.DeliveryAddressReference,
		&req.PickupAddressReference, &req.DropoffAddressReference, &req.PickupLocation, &req.DropoffLocation, &req.ItemType, &req.ScheduleMode, &req.ScheduledAt, &req.HandlingRequirements,
		&req.AssignedOperatorID, &req.DispatchAssignmentID, &req.RejectionReason,
		&req.CreatedAt, &req.UpdatedAt, &req.CompletedAt, &req.CancelledAt,
		&req.WltQuoteIssuedAt, &req.CustomerApprovedAt, &req.PurchaseBatchID, &req.PurchasedAt,
		&req.InboundReference, &req.InboundReceivedAt, &req.SortingStartedAt, &req.SortingCompletedAt,
		&req.FulfillmentPreparedAt, &req.ReadyForDeliveryAt, &req.CaptainAssignedAt, &req.PickedUpAt, &req.DeliveredAt,
		&req.MediaID, &req.SafetyStatus, &req.ModerationNote, &req.IsUnsafeContent,
		&created,
	}
	if err := scan(targets...); err != nil {
		return nil, false, err
	}
	return &req, created, nil
}

// queryRower is satisfied by both *sql.DB and *sql.Tx, letting Create/update
// run against either a pooled connection or a caller-owned transaction. The
// Tx variants exist so a mutation and the audit event describing it (see
// service.go's Create/ApplyOperatorTransitionInOperatorContext/
// CancelForClientInOperatorContext) commit or roll back together.
type queryRower interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func (r *PostgresRepository) Create(ctx context.Context, input CreateInput) (*SpecialRequest, error) {
	req, _, err := r.createWithReplay(ctx, r.db, input)
	return req, err
}

// CreateTx is Create's transactional counterpart.
func (r *PostgresRepository) CreateTx(ctx context.Context, tx *sql.Tx, input CreateInput) (*SpecialRequest, error) {
	req, _, err := r.createWithReplay(ctx, tx, input)
	return req, err
}

// CreateTxWithReplay returns whether this call inserted the request. The
// idempotency conflict path must return the canonical existing request without
// emitting a second audit/outbox mutation.
func (r *PostgresRepository) CreateTxWithReplay(ctx context.Context, tx *sql.Tx, input CreateInput) (*SpecialRequest, bool, error) {
	return r.createWithReplay(ctx, tx, input)
}

func (r *PostgresRepository) createWithReplay(ctx context.Context, exec queryRower, input CreateInput) (*SpecialRequest, bool, error) {
	var err error
	input.OperatorContextID, err = requireOperatorContextID(input.OperatorContextID)
	if err != nil {
		return nil, false, err
	}
	id := uuid.New().String()
	query := `
		INSERT INTO dsh_special_requests (
			id, operator_context_id, client_id, request_type, status, idempotency_key, workflow_stage, correlation_id,
			customer_notes, product_url, quantity, size, color, variant_notes, delivery_address_reference,
			pickup_address_reference, dropoff_address_reference, pickup_location, dropoff_location, item_type, schedule_mode, scheduled_at, handling_requirements,
			media_id, safety_status, is_unsafe_content
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18::jsonb, $19::jsonb, $20, $21, $22, $23,
			$24, 'pending', false
		)
		ON CONFLICT (operator_context_id, client_id, idempotency_key) WHERE idempotency_key IS NOT NULL
		DO UPDATE SET updated_at = now()
		RETURNING ` + specialRequestColumns + `, (xmax = 0) AS inserted`

	row := exec.QueryRowContext(ctx, query,
		id, input.OperatorContextID, input.ClientID, input.RequestType, StatusSubmitted, input.IdempotencyKey, input.workflowStage, input.CorrelationID,
		input.CustomerNotes, input.ProductUrl, input.Quantity, input.Size, input.Color, input.VariantNotes, input.DeliveryAddressReference,
		input.PickupAddressReference, input.DropoffAddressReference, nullableJSON(input.PickupLocation), nullableJSON(input.DropoffLocation), input.ItemType, input.ScheduleMode, input.ScheduledAt, input.HandlingRequirements,
		input.MediaID,
	)
	req, inserted, err := scanSpecialRequestWithCreated(row.Scan)
	return req, inserted, err
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

func (r *PostgresRepository) GetInOperatorContext(ctx context.Context, operatorContextID string, id string) (*SpecialRequest, error) {
	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE operator_context_id = $1 AND id = $2
	`
	req, err := scanSpecialRequest(r.db.QueryRowContext(ctx, query, operatorContextID, id).Scan)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return req, nil
}

// GetInOperatorContextTx reads the same canonical request projection using a
// caller-owned transaction. WLT receipts and dispatch transitions use it so
// the locked mutation, audit, and outbox records share one commit boundary.
func (r *PostgresRepository) GetInOperatorContextTx(ctx context.Context, tx *sql.Tx, operatorContextID string, id string) (*SpecialRequest, error) {
	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE operator_context_id = $1 AND id = $2
		FOR UPDATE`
	req, err := scanSpecialRequest(tx.QueryRowContext(ctx, query, operatorContextID, id).Scan)
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

func (r *PostgresRepository) UpdateInOperatorContext(ctx context.Context, operatorContextID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	return r.updateWith(ctx, r.db, operatorContextID, id, expectedVersion, input)
}

// UpdateInOperatorContextTx is UpdateInOperatorContext's transactional counterpart.
func (r *PostgresRepository) UpdateInOperatorContextTx(ctx context.Context, tx *sql.Tx, operatorContextID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	return r.updateWith(ctx, tx, operatorContextID, id, expectedVersion, input)
}

func (r *PostgresRepository) updateWith(ctx context.Context, exec queryRower, operatorContextID string, id string, expectedVersion int, input UpdateInput) (*SpecialRequest, error) {
	where := "id = $1 AND version = $2"
	args := []any{
		id, expectedVersion, input.Status, input.WorkflowStage, input.AssignedOperatorID, input.RejectionReason,
		input.wltQuoteID, input.wltQuotePolicyID, input.wltQuotePolicyVersion, input.wltQuoteVersion,
		input.wltQuoteAmountMinorUnits, input.wltQuoteCurrency, input.wltQuoteHash, input.wltQuoteExpiresAt,
		input.WltPaymentSessionID, input.setCompletedAt, input.setCancelledAt,
		input.quotePreparedAt, input.CustomerApprovedAt, input.PurchaseBatchID, input.PurchasedAt,
		input.InboundReference, input.InboundReceivedAt, input.SortingStartedAt, input.SortingCompletedAt,
		input.FulfillmentPreparedAt, input.ReadyForDeliveryAt, input.CaptainAssignedAt, input.PickedUpAt, input.DeliveredAt,
		input.SafetyStatus, input.ModerationNote, input.IsUnsafeContent,
		input.lastWltStatus, input.lastWltEventAt,
	}
	if operatorContextID != "" {
		where = "operator_context_id = $36 AND id = $1 AND version = $2"
		args = append(args, operatorContextID)
	}
	query := `
		UPDATE dsh_special_requests
		SET
			status = COALESCE($3, status),
			workflow_stage = COALESCE($4, workflow_stage),
			assigned_operator_id = COALESCE($5, assigned_operator_id),
			rejection_reason = COALESCE($6, rejection_reason),
			wlt_quote_id = COALESCE($7, wlt_quote_id),
			wlt_quote_policy_id = COALESCE($8, wlt_quote_policy_id),
			wlt_quote_policy_version = COALESCE($9, wlt_quote_policy_version),
			wlt_quote_version = COALESCE($10, wlt_quote_version),
			wlt_quote_amount_minor_units = COALESCE($11, wlt_quote_amount_minor_units),
			wlt_quote_currency = COALESCE($12, wlt_quote_currency),
			wlt_quote_hash = COALESCE($13, wlt_quote_hash),
			wlt_quote_expires_at = COALESCE($14, wlt_quote_expires_at),
			wlt_payment_session_id = COALESCE($15, wlt_payment_session_id),
			last_wlt_status = COALESCE($34, last_wlt_status),
			last_wlt_event_at = COALESCE($35, last_wlt_event_at),
			quote_prepared_at = COALESCE($18, quote_prepared_at),
			customer_approved_at = COALESCE($19, customer_approved_at),
			purchase_batch_id = COALESCE($20, purchase_batch_id),
			purchased_at = COALESCE($21, purchased_at),
			inbound_reference = COALESCE($22, inbound_reference),
			inbound_received_at = COALESCE($23, inbound_received_at),
			sorting_started_at = COALESCE($24, sorting_started_at),
			sorting_completed_at = COALESCE($25, sorting_completed_at),
			fulfillment_prepared_at = COALESCE($26, fulfillment_prepared_at),
			ready_for_delivery_at = COALESCE($27, ready_for_delivery_at),
			captain_assigned_at = COALESCE($28, captain_assigned_at),
			picked_up_at = COALESCE($29, picked_up_at),
			delivered_at = COALESCE($30, delivered_at),
			safety_status = COALESCE($31, safety_status),
			moderation_note = COALESCE($32, moderation_note),
			is_unsafe_content = COALESCE($33, is_unsafe_content),
			version = version + 1,
			updated_at = now(),
			completed_at = CASE WHEN $16 THEN now() ELSE completed_at END,
			cancelled_at = CASE WHEN $17 THEN now() ELSE cancelled_at END
		WHERE ` + where + `
		RETURNING ` + specialRequestColumns

	row := exec.QueryRowContext(ctx, query, args...)
	req, err := scanSpecialRequest(row.Scan)
	if err == sql.ErrNoRows {
		var currentVersion int
		versionQuery := `SELECT version FROM dsh_special_requests WHERE id = $1`
		versionArgs := []any{id}
		if operatorContextID != "" {
			versionQuery = `SELECT version FROM dsh_special_requests WHERE operator_context_id = $1 AND id = $2`
			versionArgs = []any{operatorContextID, id}
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
// The database dispatch-stage trigger is the canonical stage synchronizer for
// these transitions. This function reads that post-trigger state for the
// audit/outbox record, so dispatch does not maintain a second stage truth.
type DispatchTransitionMetadata struct {
	ActorID       string
	ActorRole     string
	Action        string
	Reason        string
	CorrelationID string
}

func TransitionDispatchStatusInOperatorContextWithMetadata(tx *sql.Tx, operatorContextID string, id string, allowedFrom []RequestStatus, toStatus RequestStatus, metadata DispatchTransitionMetadata) error {
	var currentStatus RequestStatus
	var version int
	var currentStage, correlationID *string
	query := `SELECT status, version, workflow_stage, correlation_id FROM dsh_special_requests WHERE id = $1 FOR UPDATE`
	args := []any{id}
	if operatorContextID != "" {
		query = `SELECT status, version, workflow_stage, correlation_id FROM dsh_special_requests WHERE operator_context_id = $1 AND id = $2 FOR UPDATE`
		args = []any{operatorContextID, id}
	}
	err := tx.QueryRow(query, args...).Scan(&currentStatus, &version, &currentStage, &correlationID)
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
	setCaptainAssignedAt := toStatus == StatusAssigned
	setDeliveredAt := toStatus == StatusCompleted
	updateQuery := `
		UPDATE dsh_special_requests
		SET status = $1, version = version + 1, updated_at = now(),
		    completed_at = CASE WHEN $2 THEN now() ELSE completed_at END,
		    cancelled_at = CASE WHEN $3 THEN now() ELSE cancelled_at END,
		    captain_assigned_at = CASE WHEN $4 THEN COALESCE(captain_assigned_at, now()) ELSE captain_assigned_at END,
		    delivered_at = CASE WHEN $5 THEN COALESCE(delivered_at, now()) ELSE delivered_at END
		WHERE id = $6`
	updateArgs := []any{string(toStatus), setCompletedAt, setCancelledAt, setCaptainAssignedAt, setDeliveredAt, id}
	if operatorContextID != "" {
		updateQuery += ` AND operator_context_id = $7`
		updateArgs = append(updateArgs, operatorContextID)
	}
	updateQuery += ` RETURNING status, version, workflow_stage`
	var updatedStatus RequestStatus
	var updatedVersion int
	var updatedStage *string
	if err = tx.QueryRow(updateQuery, updateArgs...).Scan(&updatedStatus, &updatedVersion, &updatedStage); err != nil {
		return err
	}
	actorID := strings.TrimSpace(metadata.ActorID)
	if actorID == "" {
		actorID = "dispatch"
	}
	actorRole := strings.TrimSpace(metadata.ActorRole)
	if actorRole == "" {
		actorRole = "service"
	}
	action := strings.TrimSpace(metadata.Action)
	if action == "" {
		action = "dispatch_transition"
	}
	reason := strings.TrimSpace(metadata.Reason)
	if reason == "" {
		reason = "dispatch lifecycle transition"
	}
	if strings.TrimSpace(metadata.CorrelationID) != "" {
		correlationID = &metadata.CorrelationID
	}
	correlation := ""
	if correlationID != nil {
		correlation = strings.TrimSpace(*correlationID)
	}
	fromState, _ := json.Marshal(map[string]any{
		"status": currentStatus, "version": version, "workflowStage": currentStage,
	})
	toState, _ := json.Marshal(map[string]any{
		"status": updatedStatus, "version": updatedVersion, "workflowStage": updatedStage,
	})
	if err := WriteAuditEvent(tx, id, actorID, actorRole, action, reason, correlation, fromState, toState); err != nil {
		return fmt.Errorf("write dispatch transition audit: %w", err)
	}
	return operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType: "special_request_" + string(updatedStatus), EntityType: "special_request", EntityID: id,
		Payload: toState, CorrelationID: correlation,
	})
}

// RecordDispatchAssignmentLink closes the second half of dispatch creation:
// the assignment/delivery row and the canonical special-request projection
// link are audited and notified together with the link update.
func RecordDispatchAssignmentLink(tx *sql.Tx, operatorContextID, requestID, assignmentID string, metadata DispatchTransitionMetadata) error {
	var status RequestStatus
	var version int
	var stage, correlationID *string
	query := `SELECT status, version, workflow_stage, correlation_id
		FROM dsh_special_requests WHERE id = $1 FOR UPDATE`
	args := []any{requestID}
	if operatorContextID != "" {
		query = `SELECT status, version, workflow_stage, correlation_id
			FROM dsh_special_requests WHERE operator_context_id = $1 AND id = $2 FOR UPDATE`
		args = []any{operatorContextID, requestID}
	}
	if err := tx.QueryRow(query, args...).Scan(&status, &version, &stage, &correlationID); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	actorID := strings.TrimSpace(metadata.ActorID)
	if actorID == "" {
		actorID = "dispatch"
	}
	actorRole := strings.TrimSpace(metadata.ActorRole)
	if actorRole == "" {
		actorRole = "operator"
	}
	action := strings.TrimSpace(metadata.Action)
	if action == "" {
		action = "dispatch_assignment_linked"
	}
	correlation := ""
	if metadata.CorrelationID != "" {
		correlation = strings.TrimSpace(metadata.CorrelationID)
	} else if correlationID != nil {
		correlation = strings.TrimSpace(*correlationID)
	}
	fromState, _ := json.Marshal(map[string]any{
		"status": status, "version": version - 1, "workflowStage": stage,
		"dispatchAssignmentId": nil,
	})
	toState, _ := json.Marshal(map[string]any{
		"status": status, "version": version, "workflowStage": stage,
		"dispatchAssignmentId": assignmentID,
	})
	if err := WriteAuditEvent(tx, requestID, actorID, actorRole, action, "special request dispatch assignment linked", correlation, fromState, toState); err != nil {
		return err
	}
	return operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType: "special_request_dispatch_assignment_linked", EntityType: "special_request", EntityID: requestID,
		Payload: toState, CorrelationID: correlation,
	})
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
// dispatch assignment (immediately before TransitionDispatchStatusInOperatorContext),
// so the readiness check and the resulting status transition are atomic
// together: locking here and re-locking in TransitionDispatchStatusInOperatorContext
// within the same tx is safe (Postgres row locks are reentrant within a
// transaction).
func CheckSheinDispatchReadiness(tx *sql.Tx, operatorContextID, id string) error {
	query := `SELECT request_type, workflow_stage, purchased_at, inbound_received_at,
		sorting_completed_at, fulfillment_prepared_at, ready_for_delivery_at
		FROM dsh_special_requests WHERE id = $1 FOR UPDATE`
	args := []any{id}
	if operatorContextID != "" {
		query = `SELECT request_type, workflow_stage, purchased_at, inbound_received_at,
			sorting_completed_at, fulfillment_prepared_at, ready_for_delivery_at
			FROM dsh_special_requests WHERE operator_context_id = $1 AND id = $2 FOR UPDATE`
		args = []any{operatorContextID, id}
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
	return r.ListByClientInOperatorContext(ctx, "", clientID, limit, offset)
}

func (r *PostgresRepository) ListByClientInOperatorContext(ctx context.Context, operatorContextID string, clientID string, limit, offset int) ([]SpecialRequest, int, error) {
	var err error
	operatorContextID, err = requireOperatorContextID(operatorContextID)
	if err != nil {
		return nil, 0, err
	}
	limit = clampLimit(limit)

	var total int
	err = r.db.QueryRowContext(ctx, "SELECT count(*) FROM dsh_special_requests WHERE operator_context_id = $1 AND client_id = $2", operatorContextID, clientID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT ` + specialRequestColumns + `
		FROM dsh_special_requests
		WHERE operator_context_id = $1 AND client_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.db.QueryContext(ctx, query, operatorContextID, clientID, limit, offset)
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
	return r.ListForOperatorInOperatorContext(ctx, "", reqType, status, workflowStage, limit, offset)
}

func (r *PostgresRepository) ListForOperatorInOperatorContext(ctx context.Context, operatorContextID string, reqType *string, status *string, workflowStage *string, limit, offset int) ([]SpecialRequest, int, error) {
	var err error
	operatorContextID, err = requireOperatorContextID(operatorContextID)
	if err != nil {
		return nil, 0, err
	}
	limit = clampLimit(limit)

	whereClause := "WHERE operator_context_id = $1"
	var args []interface{} = []interface{}{operatorContextID}
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
	err = r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
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
