package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
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

// UpdateDeliveryStatusGovernedIdempotentForOperatorContext preserves the
// governed delivery transition rules while making an exact replay of an
// already-applied status return the current server truth instead of a false
// state conflict.
func UpdateDeliveryStatusGovernedIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	return updateDeliveryStatusGovernedIdempotent(db, operatorContextID, assignmentID, captainID, status, 0)
}

func UpdateDeliveryStatusGovernedIdempotentVersionedForOperatorContext(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
	expectedVersion int,
) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	if expectedVersion < 1 {
		return nil, fmt.Errorf("%w: assignment version is required", ErrInvalid)
	}
	return updateDeliveryStatusGovernedIdempotent(db, operatorContextID, assignmentID, captainID, status, expectedVersion)
}

func updateDeliveryStatusGovernedIdempotent(
	db *sql.DB,
	operatorContextID string,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
	expectedVersion int,
) (*Assignment, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("%w: operator context is required", ErrInvalid)
	}
	switch status {
	case DeliveryArrivedStore, DeliveryPickedUp, DeliveryArrivedCustomer:
	default:
		return nil, fmt.Errorf("%w: unsupported delivery status", ErrInvalid)
	}

	current, err := GetCaptainAssignmentForOperatorContext(db, operatorContextID, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if status == DeliveryPickedUp && current.Delivery.Status != DeliveryPickedUp {
		if err = ensureNoActiveStoreCaptainHandoffException(db, assignmentID); err != nil {
			return nil, err
		}
	}
	if current.Delivery.Status != status {
		if expectedVersion > 0 {
			return UpdateDeliveryStatusGovernedVersionedForOperatorContext(db, operatorContextID, assignmentID, captainID, status, expectedVersion)
		}
		return UpdateDeliveryStatusGovernedForOperatorContext(db, operatorContextID, assignmentID, captainID, status)
	}

	if status == DeliveryPickedUp {
		var handoffStatus string
		err = db.QueryRow(`
                        SELECT status
                        FROM dsh_store_captain_handoffs
                        WHERE assignment_id = $1::uuid AND captain_id = $2`,
			assignmentID,
			captainID,
		).Scan(&handoffStatus)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrStoreHandoffRequired
		}
		if err != nil {
			return nil, err
		}
		if handoffStatus != "completed" {
			return nil, fmt.Errorf("%w: pickup status exists without completed store-captain custody", ErrConflict)
		}
	}

	return current, nil
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
