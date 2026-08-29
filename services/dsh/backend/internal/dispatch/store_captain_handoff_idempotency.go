package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/orders"
)

func ensureNoActiveStoreCaptainHandoffException(db *sql.DB, assignmentID string) error {
	var exceptionOpen bool
	if err := db.QueryRow(`
                SELECT EXISTS (
                        SELECT 1
                        FROM dsh_delivery_exceptions
                        WHERE assignment_id = $1::uuid
                          AND status IN ('open', 'acknowledged')
                )`, assignmentID).Scan(&exceptionOpen); err != nil {
		return err
	}
	if exceptionOpen {
		return fmt.Errorf("%w: handoff exception requires operations resolution", ErrConflict)
	}
	return nil
}

// UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext is the
// single Captain delivery-status mutation entry point. The receipt is created
// in the same transaction as the assignment/order transition, so a retry is
// resolved by command identity before any current-state eligibility check.
func UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
	expectedVersion int,
	idempotencyKey string,
	correlationID string,
) (*Assignment, error) {
	command, err := newCaptainDeliveryStatusCommand(
		operatorContextID,
		captainID,
		assignmentID,
		status,
		expectedVersion,
		idempotencyKey,
		correlationID,
	)
	if err != nil {
		return nil, err
	}
	switch status {
	case DeliveryArrivedStore:
		return updateDeliveryProgressWithStoreHandoffVersioned(
			db,
			command.OperatorContextID,
			command.AssignmentID,
			command.ActorID,
			[]DeliveryStatus{DeliveryDriverAssigned},
			status,
			orders.StatusArrivedStore,
			expectedVersion,
			command,
		)
	case DeliveryPickedUp:
		return updateDeliveryProgressWithStoreHandoffVersioned(
			db,
			command.OperatorContextID,
			command.AssignmentID,
			command.ActorID,
			[]DeliveryStatus{DeliveryArrivedStore},
			status,
			orders.StatusPickedUp,
			expectedVersion,
			command,
		)
	case DeliveryArrivedCustomer:
		return updateDeliveryProgressVersionedForContext(
			db,
			command.OperatorContextID,
			command.AssignmentID,
			command.ActorID,
			[]DeliveryStatus{DeliveryPickedUp},
			status,
			orders.StatusArrivedCustomer,
			expectedVersion,
			command,
		)
	default:
		return nil, fmt.Errorf("%w: unsupported delivery status", ErrInvalid)
	}
}

// ConfirmStoreCaptainHandoffIdempotentForOperatorContext returns the
// already-confirmed custody record before evaluating transition eligibility.
// This is required because an HTTP retry may arrive after the captain has
// already completed pickup.
func ConfirmStoreCaptainHandoffIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID string,
	orderID string,
	storeID string,
	actorID string,
) (*StoreCaptainHandoff, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	return confirmStoreCaptainHandoffIdempotent(db, operatorContextID, orderID, storeID, actorID)
}

func confirmStoreCaptainHandoffIdempotent(
	db *sql.DB,
	operatorContextID string,
	orderID string,
	storeID string,
	actorID string,
) (*StoreCaptainHandoff, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	if orderID == "" || storeID == "" || actorID == "" {
		return nil, fmt.Errorf("%w: order, store, and partner actor are required", ErrInvalid)
	}

	query := storeCaptainHandoffSelect + `
                WHERE order_id = $1::uuid AND store_id = $2
                  AND EXISTS (
                        SELECT 1 FROM dsh_orders o
                        WHERE o.id = dsh_store_captain_handoffs.order_id AND o.operator_context_id = $3
                  )
                ORDER BY created_at DESC
                LIMIT 1`
	item, err := scanStoreCaptainHandoff(db.QueryRow(
		query,
		orderID,
		storeID,
		operatorContextID,
	))
	if err == nil {
		if item.Status == "partner_confirmed" || item.Status == "completed" {
			return item, nil
		}
		if err = ensureNoActiveStoreCaptainHandoffException(db, item.AssignmentID); err != nil {
			return nil, err
		}
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	return ConfirmStoreCaptainHandoffForOperatorContext(db, operatorContextID, orderID, storeID, actorID)
}
