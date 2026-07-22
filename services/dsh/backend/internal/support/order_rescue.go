package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

type OrderRescueStatus string
type OrderRescueReason string
type OrderRescueSeverity string
type OrderRescueOwner string
type OrderRescueNextAction string

const (
	RescueOpen           OrderRescueStatus = "open"
	RescueInvestigating  OrderRescueStatus = "investigating"
	RescueActionRequired OrderRescueStatus = "action_required"
	RescueResolved       OrderRescueStatus = "resolved"
	RescueClosed         OrderRescueStatus = "closed"

	RescueWarning OrderRescueSeverity = "warning"
	RescueDanger  OrderRescueSeverity = "danger"

	RescueOwnerSupport          OrderRescueOwner = "support"
	RescueOwnerOperations       OrderRescueOwner = "operations"
	RescueOwnerPartner          OrderRescueOwner = "partner"
	RescueOwnerCaptain          OrderRescueOwner = "captain"
	RescueOwnerWLTReferenceOnly OrderRescueOwner = "wlt_reference_only"

	RescueActionReplaceItem              OrderRescueNextAction = "replace_item"
	RescueActionRemoveItem               OrderRescueNextAction = "remove_item"
	RescueActionWaitCustomer             OrderRescueNextAction = "wait_customer"
	RescueActionChangeDeliveryMode       OrderRescueNextAction = "change_delivery_mode"
	RescueActionReassignCaptain          OrderRescueNextAction = "reassign_captain"
	RescueActionConvertSupportException  OrderRescueNextAction = "convert_to_support_exception"
	RescueActionCreateFollowUpTask       OrderRescueNextAction = "create_follow_up_task"
	RescueActionOpenWLTVisibility        OrderRescueNextAction = "open_wlt_visibility"
)

type OrderRescueCase struct {
	ID             string                `json:"id"`
	OrderID        string                `json:"orderId"`
	TicketID       string                `json:"ticketId"`
	Status         OrderRescueStatus     `json:"status"`
	Reason         OrderRescueReason     `json:"reason"`
	Severity       OrderRescueSeverity   `json:"severity"`
	Owner          OrderRescueOwner      `json:"owner"`
	NextAction     OrderRescueNextAction `json:"nextAction"`
	Summary        string                `json:"summary"`
	OperatorNote   string                `json:"operatorNote"`
	AffectedEntity string                `json:"affectedEntity"`
	AssignedTo     string                `json:"assignedTo"`
	OpenedBy       string                `json:"openedBy"`
	ResolutionNote string                `json:"resolutionNote"`
	Version        int64                 `json:"version"`
	ResolvedAt     *time.Time            `json:"resolvedAt,omitempty"`
	ClosedAt       *time.Time            `json:"closedAt,omitempty"`
	CreatedAt      time.Time             `json:"createdAt"`
	UpdatedAt      time.Time             `json:"updatedAt"`
}

type OrderRescueEvent struct {
	ID            string            `json:"id"`
	RescueCaseID  string            `json:"rescueCaseId"`
	OrderID       string            `json:"orderId"`
	ActorID       string            `json:"actorId"`
	EventType     string            `json:"eventType"`
	FromStatus    OrderRescueStatus `json:"fromStatus,omitempty"`
	ToStatus      OrderRescueStatus `json:"toStatus"`
	CorrelationID string            `json:"correlationId"`
	CreatedAt     time.Time         `json:"createdAt"`
}

type CreateOrderRescueInput struct {
	ActorID        string
	OrderID        string
	TicketID       string
	Reason         OrderRescueReason
	Severity       OrderRescueSeverity
	Summary        string
	AssignedTo     string
	IdempotencyKey string
	CorrelationID  string
}

type UpdateOrderRescueInput struct {
	ActorID        string
	CaseID         string
	ExpectedStatus OrderRescueStatus
	Status         OrderRescueStatus
	Reason         OrderRescueReason
	Owner          OrderRescueOwner
	NextAction     OrderRescueNextAction
	OperatorNote   string
	AffectedEntity string
	AssignedTo     string
	ResolutionNote string
	IdempotencyKey string
	CorrelationID  string
}

func validOrderRescueStatus(value OrderRescueStatus) bool {
	switch value {
	case RescueOpen, RescueInvestigating, RescueActionRequired, RescueResolved, RescueClosed:
		return true
	default:
		return false
	}
}

func validOrderRescueReason(value OrderRescueReason) bool {
	switch value {
	case "item_unavailable", "customer_not_reachable", "store_closed_after_order",
		"captain_no_show", "captain_declined", "pickup_failed", "handoff_mismatch",
		"delivery_failed", "address_issue", "payment_failure", "wlt_visibility":
		return true
	default:
		return false
	}
}

func validOrderRescueSeverity(value OrderRescueSeverity) bool {
	return value == RescueWarning || value == RescueDanger
}

func validOrderRescueOwner(value OrderRescueOwner) bool {
	switch value {
	case RescueOwnerSupport, RescueOwnerOperations, RescueOwnerPartner, RescueOwnerCaptain, RescueOwnerWLTReferenceOnly:
		return true
	default:
		return false
	}
}

func validOrderRescueNextAction(value OrderRescueNextAction) bool {
	switch value {
	case RescueActionReplaceItem, RescueActionRemoveItem, RescueActionWaitCustomer,
		RescueActionChangeDeliveryMode, RescueActionReassignCaptain,
		RescueActionConvertSupportException, RescueActionCreateFollowUpTask,
		RescueActionOpenWLTVisibility:
		return true
	default:
		return false
	}
}

func validOrderRescueTransition(from, to OrderRescueStatus) bool {
	if from == to {
		return true
	}
	switch from {
	case RescueOpen:
		return to == RescueInvestigating || to == RescueActionRequired || to == RescueResolved || to == RescueClosed
	case RescueInvestigating:
		return to == RescueActionRequired || to == RescueResolved || to == RescueClosed
	case RescueActionRequired:
		return to == RescueInvestigating || to == RescueResolved || to == RescueClosed
	case RescueResolved:
		return to == RescueInvestigating || to == RescueClosed
	case RescueClosed:
		return false
	default:
		return false
	}
}

func validateOrderRescueDecision(owner OrderRescueOwner, nextAction OrderRescueNextAction) error {
	if owner == RescueOwnerWLTReferenceOnly && nextAction != RescueActionOpenWLTVisibility {
		return ErrInvalid
	}
	if owner != RescueOwnerWLTReferenceOnly && nextAction == RescueActionOpenWLTVisibility {
		return ErrInvalid
	}
	return nil
}

func scanOrderRescueCase(scanner interface{ Scan(...any) error }) (OrderRescueCase, error) {
	var item OrderRescueCase
	err := scanner.Scan(
		&item.ID,
		&item.OrderID,
		&item.TicketID,
		&item.Status,
		&item.Reason,
		&item.Severity,
		&item.Owner,
		&item.NextAction,
		&item.Summary,
		&item.OperatorNote,
		&item.AffectedEntity,
		&item.AssignedTo,
		&item.OpenedBy,
		&item.ResolutionNote,
		&item.Version,
		&item.ResolvedAt,
		&item.ClosedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	return item, err
}

const orderRescueSelect = `
	SELECT id::text, order_id::text, COALESCE(ticket_id::text,''), status, reason, severity,
	       owner, next_action, summary, operator_note, affected_entity, COALESCE(assigned_to,''),
	       opened_by, resolution_note, version, resolved_at, closed_at, created_at, updated_at
	FROM dsh_order_rescue_cases`

func writeOrderRescueEventTx(
	tx *sql.Tx,
	item OrderRescueCase,
	actorID string,
	eventType string,
	fromStatus OrderRescueStatus,
	toStatus OrderRescueStatus,
	correlationID string,
) error {
	var from any
	if fromStatus != "" {
		from = string(fromStatus)
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_order_rescue_events (
			rescue_case_id, order_id, actor_id, event_type, from_status, to_status, correlation_id
		) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		ON CONFLICT (rescue_case_id, event_type, correlation_id) DO NOTHING`,
		item.ID, item.OrderID, actorID, eventType, from, string(toStatus), correlationID,
	)
	return err
}

func CreateOrderRescueCase(db *sql.DB, input CreateOrderRescueInput) (OrderRescueCase, error) {
	if db == nil {
		return OrderRescueCase{}, ErrInvalid
	}
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.TicketID = strings.TrimSpace(input.TicketID)
	input.Summary = strings.TrimSpace(input.Summary)
	input.AssignedTo = strings.TrimSpace(input.AssignedTo)
	if input.Severity == "" {
		input.Severity = RescueWarning
	}
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.OrderID == "" ||
		!validOrderRescueReason(input.Reason) || !validOrderRescueSeverity(input.Severity) ||
		len(input.Summary) < 5 || len(input.Summary) > 1000 {
		return OrderRescueCase{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return OrderRescueCase{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.OrderID, idempotencyKey); err != nil {
		return OrderRescueCase{}, err
	}

	existing, err := scanOrderRescueCase(tx.QueryRow(orderRescueSelect+`
		WHERE opened_by = $1 AND create_idempotency_key = $2`, input.ActorID, idempotencyKey))
	if err == nil {
		if commitErr := tx.Commit(); commitErr != nil {
			return OrderRescueCase{}, commitErr
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return OrderRescueCase{}, err
	}

	var orderExists bool
	if err := tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM dsh_orders WHERE id = $1::uuid)`, input.OrderID).Scan(&orderExists); err != nil {
		return OrderRescueCase{}, err
	}
	if !orderExists {
		return OrderRescueCase{}, ErrNotFound
	}
	if input.TicketID != "" {
		var ticketOrderID string
		err := tx.QueryRow(`
			SELECT COALESCE(order_id::text,'')
			FROM dsh_support_tickets WHERE id = $1::uuid`, input.TicketID).Scan(&ticketOrderID)
		if errors.Is(err, sql.ErrNoRows) {
			return OrderRescueCase{}, ErrNotFound
		}
		if err != nil {
			return OrderRescueCase{}, err
		}
		if ticketOrderID != input.OrderID {
			return OrderRescueCase{}, ErrConflict
		}
	}
	var activeID string
	if err := tx.QueryRow(`
		SELECT id::text FROM dsh_order_rescue_cases
		WHERE order_id = $1::uuid AND status NOT IN ('resolved','closed')
		LIMIT 1`, input.OrderID).Scan(&activeID); err == nil {
		return OrderRescueCase{}, ErrConflict
	} else if !errors.Is(err, sql.ErrNoRows) {
		return OrderRescueCase{}, err
	}

	var nullableTicket any
	if input.TicketID != "" {
		nullableTicket = input.TicketID
	}
	created, err := scanOrderRescueCase(tx.QueryRow(`
		INSERT INTO dsh_order_rescue_cases (
			order_id, ticket_id, reason, severity, summary, assigned_to, opened_by,
			create_idempotency_key, correlation_id
		) VALUES ($1::uuid, NULLIF($2,'')::uuid, $3, $4, $5, NULLIF($6,''), $7, $8, $9)
		RETURNING id::text, order_id::text, COALESCE(ticket_id::text,''), status, reason, severity,
		          owner, next_action, summary, operator_note, affected_entity, COALESCE(assigned_to,''),
		          opened_by, resolution_note, version, resolved_at, closed_at, created_at, updated_at`,
		input.OrderID, nullableTicket, input.Reason, input.Severity, input.Summary,
		input.AssignedTo, input.ActorID, idempotencyKey, correlationID,
	))
	if err != nil {
		return OrderRescueCase{}, err
	}
	if err := writeOrderRescueEventTx(tx, created, input.ActorID, "created", "", RescueOpen, correlationID); err != nil {
		return OrderRescueCase{}, err
	}
	if err := tx.Commit(); err != nil {
		return OrderRescueCase{}, err
	}
	return created, nil
}

func ListOrderRescueCases(db *sql.DB, statusFilter string, limit int) ([]OrderRescueCase, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	statusFilter = strings.TrimSpace(statusFilter)
	if statusFilter != "" && !validOrderRescueStatus(OrderRescueStatus(statusFilter)) {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	query := orderRescueSelect
	args := []any{}
	if statusFilter == "" {
		query += ` ORDER BY updated_at DESC, id DESC LIMIT $1`
		args = append(args, limit)
	} else {
		query += ` WHERE status = $1 ORDER BY updated_at DESC, id DESC LIMIT $2`
		args = append(args, statusFilter, limit)
	}
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]OrderRescueCase, 0)
	for rows.Next() {
		item, err := scanOrderRescueCase(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func GetOrderRescueCase(db *sql.DB, caseID string) (OrderRescueCase, error) {
	if db == nil || strings.TrimSpace(caseID) == "" {
		return OrderRescueCase{}, ErrInvalid
	}
	item, err := scanOrderRescueCase(db.QueryRow(orderRescueSelect+` WHERE id = $1::uuid`, strings.TrimSpace(caseID)))
	if errors.Is(err, sql.ErrNoRows) {
		return OrderRescueCase{}, ErrNotFound
	}
	return item, err
}

func UpdateOrderRescueCase(db *sql.DB, input UpdateOrderRescueInput) (OrderRescueCase, error) {
	if db == nil {
		return OrderRescueCase{}, ErrInvalid
	}
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.CaseID = strings.TrimSpace(input.CaseID)
	input.OperatorNote = strings.TrimSpace(input.OperatorNote)
	input.AffectedEntity = strings.TrimSpace(input.AffectedEntity)
	input.AssignedTo = strings.TrimSpace(input.AssignedTo)
	input.ResolutionNote = strings.TrimSpace(input.ResolutionNote)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.CaseID == "" ||
		!validOrderRescueStatus(input.Status) || !validOrderRescueReason(input.Reason) ||
		!validOrderRescueOwner(input.Owner) || !validOrderRescueNextAction(input.NextAction) ||
		len(input.OperatorNote) > 4000 || len(input.AffectedEntity) > 500 || len(input.ResolutionNote) > 4000 {
		return OrderRescueCase{}, ErrInvalid
	}
	if err := validateOrderRescueDecision(input.Owner, input.NextAction); err != nil {
		return OrderRescueCase{}, err
	}
	if (input.Status == RescueResolved || input.Status == RescueClosed) &&
		(len(input.OperatorNote) < 5 || len(input.ResolutionNote) < 5) {
		return OrderRescueCase{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return OrderRescueCase{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.CaseID, idempotencyKey); err != nil {
		return OrderRescueCase{}, err
	}
	current, err := scanOrderRescueCase(tx.QueryRow(orderRescueSelect+` WHERE id = $1::uuid FOR UPDATE`, input.CaseID))
	if errors.Is(err, sql.ErrNoRows) {
		return OrderRescueCase{}, ErrNotFound
	}
	if err != nil {
		return OrderRescueCase{}, err
	}
	if input.ExpectedStatus != "" && input.ExpectedStatus != current.Status {
		return OrderRescueCase{}, ErrConflict
	}
	if !validOrderRescueTransition(current.Status, input.Status) {
		return OrderRescueCase{}, ErrConflict
	}

	_, err = tx.Exec(`
		UPDATE dsh_order_rescue_cases
		SET status = $2,
		    reason = $3,
		    owner = $4,
		    next_action = $5,
		    operator_note = $6,
		    affected_entity = $7,
		    assigned_to = NULLIF($8,''),
		    resolution_note = $9,
		    resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, NOW()) WHEN $2 <> 'closed' THEN NULL ELSE resolved_at END,
		    closed_at = CASE WHEN $2 = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1::uuid`,
		input.CaseID, input.Status, input.Reason, input.Owner, input.NextAction,
		input.OperatorNote, input.AffectedEntity, input.AssignedTo, input.ResolutionNote,
	)
	if err != nil {
		return OrderRescueCase{}, err
	}
	updated, err := scanOrderRescueCase(tx.QueryRow(orderRescueSelect+` WHERE id = $1::uuid`, input.CaseID))
	if err != nil {
		return OrderRescueCase{}, err
	}
	eventType := "decision_recorded"
	if current.Status != updated.Status {
		eventType = "status_changed"
	}
	if updated.Status == RescueResolved {
		eventType = "resolved"
	}
	if updated.Status == RescueClosed {
		eventType = "closed"
	}
	if err := writeOrderRescueEventTx(tx, updated, input.ActorID, eventType, current.Status, updated.Status, correlationID); err != nil {
		return OrderRescueCase{}, err
	}
	if err := tx.Commit(); err != nil {
		return OrderRescueCase{}, err
	}
	return updated, nil
}

func ListOrderRescueEvents(db *sql.DB, caseID string, limit int) ([]OrderRescueEvent, error) {
	if db == nil || strings.TrimSpace(caseID) == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := db.Query(`
		SELECT id::text, rescue_case_id::text, order_id::text, actor_id, event_type,
		       COALESCE(from_status,''), to_status, correlation_id, created_at
		FROM dsh_order_rescue_events
		WHERE rescue_case_id = $1::uuid
		ORDER BY created_at, id
		LIMIT $2`, strings.TrimSpace(caseID), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]OrderRescueEvent, 0)
	for rows.Next() {
		var item OrderRescueEvent
		if err := rows.Scan(
			&item.ID,
			&item.RescueCaseID,
			&item.OrderID,
			&item.ActorID,
			&item.EventType,
			&item.FromStatus,
			&item.ToStatus,
			&item.CorrelationID,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
