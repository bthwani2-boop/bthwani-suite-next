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
)

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
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
	if orderID == "" || storeCourierID == "" {
		return nil, fmt.Errorf("%w: orderId and storeCourierId are required", ErrInvalid)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var storeID, fulfillmentMode, orderStatus string
	err = tx.QueryRow(`SELECT store_id, fulfillment_mode, status FROM dsh_orders WHERE id = $1::uuid FOR UPDATE`, orderID).
		Scan(&storeID, &fulfillmentMode, &orderStatus)
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
	if err := tx.QueryRow(`
		SELECT count(*) FROM dsh_assignments
		WHERE order_id = $1::uuid AND status IN ('offered','accepted')`, orderID).Scan(&activeAssignments); err != nil {
		return nil, err
	}
	if activeAssignments > 0 {
		return nil, fmt.Errorf("%w: order already has an active bthwani-captain assignment", ErrAlreadyAssigned)
	}

	var courierStoreID, courierRole, courierStatus string
	err = tx.QueryRow(`SELECT store_id, role, status FROM dsh_store_team_members WHERE id = $1 FOR UPDATE`, storeCourierID).
		Scan(&courierStoreID, &courierRole, &courierStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: store courier not found", ErrCourierIneligible)
	}
	if err != nil {
		return nil, err
	}
	if courierRole != "courier" || courierStatus != "active" || courierStoreID != storeID {
		return nil, fmt.Errorf("%w: courier must be an active courier of the order's store", ErrCourierIneligible)
	}

	current, err := GetForUpdateByOrderID(tx, orderID)
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
		res, err := tx.Exec(`
			UPDATE dsh_partner_delivery_tasks
			SET store_courier_id = $1, status = $2, assigned_at = NOW(), version = version + 1, updated_at = NOW()
			WHERE id = $3 AND version = $4`,
			storeCourierID, string(StatusAssigned), taskID, current.Version)
		if err != nil {
			return nil, err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return nil, ErrVersionConflict
		}
	}

	updated, err := scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
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
	return Get(s.db, updated.ID)
}

// MarkPickedUp stamps picked_up_at without changing the courier-facing
// status (still "assigned" -- the table has no distinct picked-up status).
func (s *Service) MarkPickedUp(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.transition(ctx, taskID, expectedVersion, []Status{StatusAssigned}, "", "picked_up_at", "mark_picked_up", "", actorID, actorRole, correlationID)
}

// MarkDeparted moves the task from assigned to departed.
func (s *Service) MarkDeparted(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.transition(ctx, taskID, expectedVersion, []Status{StatusAssigned}, StatusDeparted, "departed_at", "mark_departed", "", actorID, actorRole, correlationID)
}

// MarkArrived moves the task from departed to arrived.
func (s *Service) MarkArrived(ctx context.Context, taskID string, expectedVersion int, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	return s.transition(ctx, taskID, expectedVersion, []Status{StatusDeparted}, StatusArrived, "arrived_at", "mark_arrived", "", actorID, actorRole, correlationID)
}

// SubmitProof records proof of delivery and completes the task.
func (s *Service) SubmitProof(ctx context.Context, taskID string, expectedVersion int, proofMethod, proofReference, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(proofMethod) == "" {
		return nil, fmt.Errorf("%w: proofMethod is required", ErrInvalid)
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := GetForUpdate(tx, taskID)
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

	res, err := tx.Exec(`
		UPDATE dsh_partner_delivery_tasks
		SET status = $1, proof_method = $2, proof_reference = $3, completed_at = NOW(),
		    version = version + 1, updated_at = NOW()
		WHERE id = $4 AND version = $5`,
		string(StatusCompleted), proofMethod, proofReference, taskID, expectedVersion)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	updated, err := scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
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
	return Get(s.db, updated.ID)
}

// RaiseException moves the task into the exception state from any
// non-terminal status, requiring a reason.
func (s *Service) RaiseException(ctx context.Context, taskID string, expectedVersion int, reason, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	if strings.TrimSpace(reason) == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	return s.transition(ctx, taskID, expectedVersion,
		[]Status{StatusUnassigned, StatusAssigned, StatusDeparted, StatusArrived, StatusProofPending},
		StatusException, "", "raise_exception", reason, actorID, actorRole, correlationID)
}

func containsStatus(list []Status, s Status) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

// transition is the shared BEGIN -> lock -> validate -> UPDATE -> audit ->
// outbox -> COMMIT pattern for the single-timestamp transitions above. If
// toStatus is "", the status column is left unchanged (used by
// MarkPickedUp, which only stamps a timestamp).
func (s *Service) transition(ctx context.Context, taskID string, expectedVersion int, allowedFrom []Status, toStatus Status, timestampColumn, action, reason, actorID, actorRole, correlationID string) (*PartnerDeliveryTask, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := GetForUpdate(tx, taskID)
	if err != nil {
		return nil, err
	}
	if current.Version != expectedVersion {
		return nil, ErrVersionConflict
	}
	if !containsStatus(allowedFrom, current.Status) {
		return nil, fmt.Errorf("%w: cannot %s from status %s", ErrConflict, action, current.Status)
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

	res, err := tx.Exec(query, args...)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrVersionConflict
	}

	updated, err := scanTask(tx.QueryRow(`SELECT `+taskColumns+` FROM dsh_partner_delivery_tasks WHERE id = $1`, taskID).Scan)
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
	return Get(s.db, updated.ID)
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
