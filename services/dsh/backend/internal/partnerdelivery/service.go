package partnerdelivery

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/operationaloutbox"
	"dsh-api/internal/orders"
	"dsh-api/internal/workforceclient"
)

type Service struct {
	db *sql.DB
	wf *workforceclient.Client
}

func NewService(db *sql.DB, wf *workforceclient.Client) *Service {
	return &Service{db: db, wf: wf}
}

func taskJSON(t *PartnerDeliveryTask) []byte {
	if t == nil {
		return nil
	}
	b, _ := json.Marshal(t)
	return b
}

// assignableStatuses are the partner_delivery_task statuses from which a
// (re-)assignment of a courier is permitted: a brand new row (unassigned)
// or one that fell into exception and is being retried.
var assignableStatuses = map[Status]bool{
	StatusUnassigned: true,
	StatusException:  true,
}

// AssignCourier assigns a store courier to a partner_delivery order,
// creating the dsh_partner_delivery_tasks row if this is the first
// assignment attempt for the order. It validates: the order's
// fulfillment_mode is partner_delivery, the order is ready_for_pickup, no
// active dsh_assignments row exists for the order (bthwani-captain
// dispatch), and the courier is an active courier belonging to the same
// store as the order.
func (s *Service) AssignCourier(ctx context.Context, orderID, storeCourierID, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.assignCourier(ctx, "", orderID, storeCourierID, actorID, actorRole, correlationID)
}

func (s *Service) assignCourier(ctx context.Context, operatorContextID, orderID, storeCourierID, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if orderID == "" || storeCourierID == "" {
		return nil, fmt.Errorf("%w: orderId and storeCourierId are required", ErrInvalid)
	}
	if operatorContextID == "" && actorRole == "partner" {
		return nil, fmt.Errorf("%w: operator context is required for partner command", ErrInvalid)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var storeID, fulfillmentMode, orderStatus string
	orderQuery := `SELECT store_id, fulfillment_mode, status FROM dsh_orders WHERE id = $1::uuid`
	orderArgs := []any{orderID}
	if operatorContextID != "" {
		orderQuery += ` AND operator_context_id = $2`
		orderArgs = append(orderArgs, operatorContextID)
	}
	orderQuery += ` FOR UPDATE`
	err = tx.QueryRow(orderQuery, orderArgs...).Scan(&storeID, &fulfillmentMode, &orderStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	// dsh_orders has no branch_id column in this schema phase (single-branch
	// stores); dsh_partner_delivery_tasks.branch_id is NOT NULL, so it is
	// populated from the order's store_id.
	branchID := storeID
	if fulfillmentMode != "partner_delivery" {
		return nil, fmt.Errorf("%w: order fulfillment mode is %s, not partner_delivery", ErrNotReadyForAssignment, fulfillmentMode)
	}
	if orderStatus != string(orders.StatusReadyForPickup) {
		return nil, fmt.Errorf("%w: order status is %s, expected %s", ErrNotReadyForAssignment, orderStatus, orders.StatusReadyForPickup)
	}

	var activeAssignments int
	assignmentQuery := `
		SELECT count(*) FROM dsh_assignments
		WHERE order_id = $1::uuid AND status IN ('offered','accepted')`
	assignmentArgs := []any{orderID}
	if operatorContextID != "" {
		assignmentQuery += ` AND operator_context_id = $2`
		assignmentArgs = append(assignmentArgs, operatorContextID)
	}
	if err := tx.QueryRow(assignmentQuery, assignmentArgs...).Scan(&activeAssignments); err != nil {
		return nil, err
	}
	if activeAssignments > 0 {
		return nil, fmt.Errorf("%w: order already has an active bthwani-captain assignment", ErrAlreadyAssigned)
	}

	if s.wf == nil {
		return nil, fmt.Errorf("J014: workforce client is required to verify courier")
	}
	readiness, err := s.wf.ActivationReadiness(ctx, storeCourierID)
	if err != nil {
		return nil, fmt.Errorf("verify courier readiness: %w", err)
	}
	if !readiness.IsActive {
		return nil, fmt.Errorf("%w: courier is not active in workforce", ErrCourierIneligible)
	}

	var current *PartnerDeliveryTask
	if operatorContextID != "" {
		current, err = GetForUpdateByOrderIDForOperatorContext(tx, operatorContextID, orderID)
	} else {
		current, err = GetForUpdateByOrderID(tx, orderID)
	}
	var taskID string
	var fromJSON []byte
	if errors.Is(err, ErrNotFound) {
		row := tx.QueryRow(`
			INSERT INTO dsh_partner_delivery_tasks
				(order_id, store_id, branch_id, store_courier_id, status, assigned_at)
			VALUES ($1::uuid, $2, $3, $4, $5, NOW())
			RETURNING id`,
			orderID, storeID, branchID, storeCourierID, string(StatusAssigned))
		if err := row.Scan(&taskID); err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		if !assignableStatuses[current.Status] {
			return nil, fmt.Errorf("%w: task is already in status %s", ErrAlreadyAssigned, current.Status)
		}
		fromJSON = taskJSON(current)
		taskID = current.ID
		query := `
			UPDATE dsh_partner_delivery_tasks
			SET store_courier_id = $1, status = $2, assigned_at = NOW(), version = version + 1, updated_at = NOW()
			WHERE id = $3 AND version = $4`
		args := []any{storeCourierID, string(StatusAssigned), taskID, current.Version}
		if operatorContextID != "" {
			query += ` AND EXISTS (SELECT 1 FROM dsh_orders o WHERE o.id = dsh_partner_delivery_tasks.order_id AND o.operator_context_id = $5)`
			args = append(args, operatorContextID)
		}
		res, err := tx.Exec(query, args...)
		if err != nil {
			return nil, err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return nil, ErrVersionConflict
		}
	}

	var updated *PartnerDeliveryTask
	if operatorContextID != "" {
		updated, err = scanTask(tx.QueryRow(`SELECT `+taskColumnsPrefixed+` FROM dsh_partner_delivery_tasks t JOIN dsh_orders o ON o.id = t.order_id WHERE t.id = $1 AND o.operator_context_id = $2`, taskID, operatorContextID).Scan)
	} else {
		updated, err = scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
	}
	if err != nil {
		return nil, err
	}

	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "assign_courier", "", correlationID, fromJSON, taskJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "partner_delivery_assigned", updated, correlationID); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	if operatorContextID != "" {
		return GetForOperatorContext(s.db, operatorContextID, updated.ID)
	}
	return Get(s.db, updated.ID)
}

type orderTransition struct {
	allowedFrom []orders.OrderStatus
	to          orders.OrderStatus
	note        string
}

// MarkPickedUp records pickup and advances the sovereign order in the same
// transaction. The task remains assigned until the courier departs, but the
// client-visible order must no longer remain ready_for_pickup.
func (s *Service) MarkPickedUp(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.transitionForContext(ctx, "",
		taskID,
		expectedVersion,
		[]Status{StatusAssigned},
		"",
		"picked_up_at",
		"mark_picked_up",
		"",
		actorID,
		actorRole,
		correlationID,
		&orderTransition{
			allowedFrom: []orders.OrderStatus{orders.StatusReadyForPickup},
			to:          orders.StatusPickedUp,
			note:        "partner courier picked up order",
		},
	)
}

// MarkDeparted moves the task from assigned to departed. Pickup must already
// have been recorded, so the courier cannot skip the pickup acknowledgement.
func (s *Service) MarkDeparted(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.transitionForContext(ctx, "", taskID, expectedVersion, []Status{StatusAssigned}, StatusDeparted, "departed_at", "mark_departed", "", actorID, actorRole, correlationID, nil)
}

// MarkArrived moves the task from departed to arrived and advances the order
// to arrived_customer atomically for client tracking.
func (s *Service) MarkArrived(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.transitionForContext(ctx, "",
		taskID,
		expectedVersion,
		[]Status{StatusDeparted},
		StatusArrived,
		"arrived_at",
		"mark_arrived",
		"",
		actorID,
		actorRole,
		correlationID,
		&orderTransition{
			allowedFrom: []orders.OrderStatus{orders.StatusPickedUp},
			to:          orders.StatusArrivedCustomer,
			note:        "partner courier arrived at customer",
		},
	)
}

// SubmitProof records proof of delivery, completes the task and the source
// order, and queues the WLT COD completion event inside one transaction.
func (s *Service) SubmitProof(ctx context.Context, taskID string, expectedVersion int, proofMethod, proofReference, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.submitProofForContext(ctx, "", taskID, expectedVersion, proofMethod, proofReference, actorID, actorRole, correlationID)
}

func (s *Service) submitProofForContext(ctx context.Context, operatorContextID, taskID string, expectedVersion int, proofMethod, proofReference, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if strings.TrimSpace(proofMethod) == "" || strings.TrimSpace(proofReference) == "" {
		return nil, fmt.Errorf("%w: proofMethod and proofReference are required", ErrInvalid)
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var current *PartnerDeliveryTask
	if operatorContextID != "" {
		current, err = GetForUpdateForOperatorContext(tx, operatorContextID, taskID)
	} else {
		current, err = GetForUpdate(tx, taskID)
	}
	if err != nil {
		return nil, err
	}
	if current.Version != expectedVersion {
		return nil, ErrVersionConflict
	}
	if !containsStatus([]Status{StatusArrived, StatusProofPending}, current.Status) {
		return nil, fmt.Errorf("%w: cannot submit proof from status %s", ErrConflict, current.Status)
	}
	fromJSON := taskJSON(current)

	query := `
		UPDATE dsh_partner_delivery_tasks
		SET status = $1, proof_method = $2, proof_reference = $3, completed_at = NOW(),
		    version = version + 1, updated_at = NOW()
		WHERE id = $4 AND version = $5`
	args := []any{string(StatusCompleted), strings.TrimSpace(proofMethod), strings.TrimSpace(proofReference), taskID, expectedVersion}
	if operatorContextID != "" {
		query += ` AND EXISTS (SELECT 1 FROM dsh_orders o WHERE o.id = dsh_partner_delivery_tasks.order_id AND o.operator_context_id = $6)`
		args = append(args, operatorContextID)
	}
	res, err := tx.Exec(query, args...)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	if _, err := orders.TransitionDispatchOrder(
		tx,
		current.OrderID,
		actorID,
		actorRole,
		[]orders.OrderStatus{orders.StatusArrivedCustomer},
		orders.StatusDelivered,
		"partner delivery proof submitted",
	); err != nil {
		return nil, mapOrderError(err)
	}

	var updated *PartnerDeliveryTask
	if operatorContextID != "" {
		updated, err = scanTask(tx.QueryRow(`SELECT `+taskColumnsPrefixed+` FROM dsh_partner_delivery_tasks t JOIN dsh_orders o ON o.id = t.order_id WHERE t.id = $1 AND o.operator_context_id = $2`, taskID, operatorContextID).Scan)
	} else {
		updated, err = scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
	}
	if err != nil {
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, "submit_proof", "", correlationID, fromJSON, taskJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "partner_delivery_completed", updated, correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	if operatorContextID != "" {
		return GetForOperatorContext(s.db, operatorContextID, updated.ID)
	}
	return Get(s.db, updated.ID)
}

// RaiseException moves the task into the exception state from any
// non-terminal status, requiring a reason.
func (s *Service) RaiseException(ctx context.Context, taskID string, expectedVersion int, reason, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(reason) == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	return s.transitionForContext(ctx, "", taskID, expectedVersion,
		[]Status{StatusUnassigned, StatusAssigned, StatusDeparted, StatusArrived, StatusProofPending},
		StatusException, "", "raise_exception", reason, actorID, actorRole, correlationID, nil)
}

func containsStatus(list []Status, s Status) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

// transition is the shared BEGIN -> lock -> validate -> UPDATE -> optional
// order transition -> audit -> outbox -> COMMIT pattern for timestamp/state
// transitions. Any order transition is committed or rolled back with the task.
func (s *Service) transition(ctx context.Context, taskID string, expectedVersion int, allowedFrom []Status, toStatus Status, timestampColumn, action, reason, actorID, actorRole, correlationID string, orderStep *orderTransition) (*PartnerDeliveryTask, error) {
	return s.transitionForContext(ctx, "", taskID, expectedVersion, allowedFrom, toStatus, timestampColumn, action, reason, actorID, actorRole, correlationID, orderStep)
}

func (s *Service) transitionForContext(ctx context.Context, operatorContextID, taskID string, expectedVersion int, allowedFrom []Status, toStatus Status, timestampColumn, action, reason, actorID, actorRole, correlationID string, orderStep *orderTransition) (*PartnerDeliveryTask, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var current *PartnerDeliveryTask
	if operatorContextID != "" {
		current, err = GetForUpdateForOperatorContext(tx, operatorContextID, taskID)
	} else {
		current, err = GetForUpdate(tx, taskID)
	}
	if err != nil {
		return nil, err
	}
	if current.Version != expectedVersion {
		return nil, ErrVersionConflict
	}
	if !containsStatus(allowedFrom, current.Status) {
		return nil, fmt.Errorf("%w: cannot %s from status %s", ErrConflict, action, current.Status)
	}
	if action == "mark_departed" && current.PickedUpAt == nil {
		return nil, fmt.Errorf("%w: pickup must be recorded before departure", ErrConflict)
	}
	fromJSON := taskJSON(current)

	newStatus := current.Status
	if toStatus != "" {
		newStatus = toStatus
	}
	query := `UPDATE dsh_partner_delivery_tasks SET status = $1, version = version + 1, updated_at = NOW()`
	args := []any{string(newStatus)}
	argIdx := 2
	if timestampColumn != "" {
		query += fmt.Sprintf(`, %s = NOW()`, timestampColumn)
	}
	query += fmt.Sprintf(` WHERE id = $%d AND version = $%d`, argIdx, argIdx+1)
	args = append(args, taskID, expectedVersion)
	if operatorContextID != "" {
		query += fmt.Sprintf(` AND EXISTS (SELECT 1 FROM dsh_orders o WHERE o.id = dsh_partner_delivery_tasks.order_id AND o.operator_context_id = $%d)`, argIdx+2)
		args = append(args, operatorContextID)
	}

	res, err := tx.Exec(query, args...)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	if orderStep != nil {
		if _, err := orders.TransitionDispatchOrder(
			tx,
			current.OrderID,
			actorID,
			actorRole,
			orderStep.allowedFrom,
			orderStep.to,
			orderStep.note,
		); err != nil {
			return nil, mapOrderError(err)
		}
	}

	var updated *PartnerDeliveryTask
	if operatorContextID != "" {
		updated, err = scanTask(tx.QueryRow(`SELECT `+taskColumnsPrefixed+` FROM dsh_partner_delivery_tasks t JOIN dsh_orders o ON o.id=t.order_id WHERE t.id = $1 AND o.operator_context_id = $2`, taskID, operatorContextID).Scan)
	} else {
		updated, err = scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
	}
	if err != nil {
		return nil, err
	}
	if err := WriteAuditEvent(tx, updated.ID, actorID, actorRole, action, reason, correlationID, fromJSON, taskJSON(updated)); err != nil {
		return nil, err
	}
	if err := enqueueEvent(tx, "partner_delivery_"+action, updated, correlationID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	if operatorContextID != "" {
		return GetForOperatorContext(s.db, operatorContextID, updated.ID)
	}
	return Get(s.db, updated.ID)
}

func mapOrderError(err error) error {
	switch {
	case errors.Is(err, orders.ErrNotFound):
		return ErrNotFound
	case errors.Is(err, orders.ErrConflict):
		return ErrConflict
	default:
		return err
	}
}

func enqueueEvent(tx *sql.Tx, eventType string, task *PartnerDeliveryTask, correlationID string) error {
	return operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType:     eventType,
		EntityType:    "partner_delivery_task",
		EntityID:      task.ID,
		Payload:       taskJSON(task),
		CorrelationID: correlationID,
	})
}
