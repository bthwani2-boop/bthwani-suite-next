package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
)

// UpdateDeliveryStatusGovernedIdempotent preserves the governed delivery
// transition rules while making an exact replay of an already-applied status
// return the current server truth instead of a false state conflict.
func UpdateDeliveryStatusGovernedIdempotent(
	db *sql.DB,
	assignmentID string,
	captainID string,
	status DeliveryStatus,
) (*Assignment, error) {
	switch status {
	case DeliveryArrivedStore, DeliveryPickedUp, DeliveryArrivedCustomer:
	default:
		return nil, fmt.Errorf("%w: unsupported delivery status", ErrInvalid)
	}

	current, err := GetCaptainAssignment(db, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Delivery.Status != status {
		return UpdateDeliveryStatusGoverned(db, assignmentID, captainID, status)
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

// ConfirmStoreCaptainHandoffIdempotent returns the already-confirmed custody
// record before evaluating transition eligibility. This is required because an
// HTTP retry may arrive after the captain has already completed pickup.
func ConfirmStoreCaptainHandoffIdempotent(
	db *sql.DB,
	orderID string,
	storeID string,
	actorID string,
) (*StoreCaptainHandoff, error) {
	if orderID == "" || storeID == "" || actorID == "" {
		return nil, fmt.Errorf("%w: order, store, and partner actor are required", ErrInvalid)
	}

	item, err := scanStoreCaptainHandoff(db.QueryRow(
		storeCaptainHandoffSelect+`
		WHERE order_id = $1::uuid AND store_id = $2
		ORDER BY created_at DESC
		LIMIT 1`,
		orderID,
		storeID,
	))
	if err == nil && (item.Status == "partner_confirmed" || item.Status == "completed") {
		return item, nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	return ConfirmStoreCaptainHandoff(db, orderID, storeID, actorID)
}
