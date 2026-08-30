package dispatch

import (
	"database/sql"
	"fmt"
	"strings"

	"dsh-api/internal/orders"
)

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

// ConfirmStoreCaptainHandoffIdempotentForOperatorContext is the sole partner
// handoff confirmation command. Its receipt is committed with the handoff
// transition so retries return the same canonical custody record.
func ConfirmStoreCaptainHandoffIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID string,
	orderID string,
	storeID string,
	actorID string,
	idempotencyKey string,
	correlationID string,
) (*StoreCaptainHandoff, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	command, err := newStoreCaptainHandoffConfirmationCommand(operatorContextID, actorID, orderID, storeID, idempotencyKey, correlationID)
	if err != nil {
		return nil, err
	}
	return confirmStoreCaptainHandoff(db, command, orderID, storeID, actorID)
}
