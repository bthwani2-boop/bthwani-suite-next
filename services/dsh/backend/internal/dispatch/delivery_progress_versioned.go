package dispatch

import (
	"database/sql"
	"fmt"
	"strings"

	"dsh-api/internal/orders"
)

func updateDeliveryProgressVersioned(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	allowed []DeliveryStatus,
	next DeliveryStatus,
	orderStatus orders.OrderStatus,
	expectedVersion int,
	command captainDeliveryStatusCommand,
	requiresStoreHandoff bool,
) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	replayed, err := beginCaptainDeliveryStatusCommand(tx, command)
	if err != nil {
		return nil, err
	}
	if replayed {
		if err = tx.Commit(); err != nil {
			return nil, err
		}
		return GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
	}
	current, err := lockAssignmentForOperatorContext(tx, operatorContextID, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)
	}
	if expectedVersion > 0 && current.Version != expectedVersion {
		return nil, fmt.Errorf("%w: assignment version changed", ErrConflict)
	}
	if err = ensureNoOpenDeliveryException(tx, assignmentID); err != nil {
		return nil, err
	}
	if current.Status != AssignmentAccepted {
		return nil, fmt.Errorf("%w: assignment is not accepted", ErrConflict)
	}
	valid := false
	for _, candidate := range allowed {
		if current.Delivery.Status == candidate {
			valid = true
			break
		}
	}
	if !valid {
		return nil, fmt.Errorf("%w: delivery cannot move from %s to %s", ErrConflict, current.Delivery.Status, next)
	}
	if requiresStoreHandoff && current.OrderID != "" {
		if next == DeliveryPickedUp {
			if err = requireStoreCaptainHandoffConfirmed(tx, assignmentID, captainID); err != nil {
				return nil, err
			}
		}
		if next == DeliveryArrivedStore {
			if err = ensureStoreCaptainHandoff(tx, current); err != nil {
				return nil, err
			}
		}
	}
	if current.OrderID != "" {
		allowedOrderStatuses := []orders.OrderStatus{orders.OrderStatus(current.Delivery.Status)}
		if requiresStoreHandoff && next == DeliveryPickedUp {
			allowedOrderStatuses = []orders.OrderStatus{orders.StatusStoreHandoffConfirmed}
		}
		if _, err = orders.TransitionDispatchOrder(tx, operatorContextID, current.OrderID, captainID, "captain", allowedOrderStatuses, orderStatus, string(next)); err != nil {
			return nil, mapOrderError(err)
		}
	}
	if _, err = tx.Exec(`
                UPDATE dsh_assignments SET version=version+1, updated_at=NOW()
                WHERE id=$1::uuid AND captain_id=$2`, assignmentID, captainID); err != nil {
		return nil, err
	}
	if _, err = tx.Exec(`
                UPDATE dsh_deliveries SET status=$1, updated_at=NOW()
                WHERE assignment_id=$2::uuid AND captain_id=$3`, string(next), assignmentID, captainID); err != nil {
		return nil, err
	}
	if requiresStoreHandoff && current.OrderID != "" && next == DeliveryPickedUp {
		if err = completeStoreCaptainHandoff(tx, assignmentID, captainID); err != nil {
			return nil, err
		}
	}
	if err = recordCaptainDeliveryStatusCommand(tx, command); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
}
