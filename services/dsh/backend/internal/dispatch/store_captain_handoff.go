package dispatch

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"dsh-api/internal/orders"
)

var ErrStoreHandoffRequired = errors.New("store handoff confirmation is required")

type StoreCaptainHandoff struct {
	ID                        string
	OrderID                   string
	AssignmentID              string
	StoreID                   string
	CaptainID                 string
	Status                    string
	PartnerConfirmedAt        *time.Time
	PartnerConfirmedByActorID string
	CaptainConfirmedAt        *time.Time
	CaptainConfirmedByActorID string
	Version                   int
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanStoreCaptainHandoff(row rowScanner) (*StoreCaptainHandoff, error) {
	var item StoreCaptainHandoff
	err := row.Scan(
		&item.ID,
		&item.OrderID,
		&item.AssignmentID,
		&item.StoreID,
		&item.CaptainID,
		&item.Status,
		&item.PartnerConfirmedAt,
		&item.PartnerConfirmedByActorID,
		&item.CaptainConfirmedAt,
		&item.CaptainConfirmedByActorID,
		&item.Version,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	return &item, err
}

const storeCaptainHandoffSelect = `
	SELECT id::text, order_id::text, assignment_id::text, store_id, captain_id, status,
	       partner_confirmed_at, COALESCE(partner_confirmed_by_actor_id, ''),
	       captain_confirmed_at, COALESCE(captain_confirmed_by_actor_id, ''),
	       version, created_at, updated_at
	FROM dsh_store_captain_handoffs`

func ensureStoreCaptainHandoff(tx *sql.Tx, current *Assignment) error {
	if current.OrderID == "" {
		return nil
	}

	var storeID, fulfillmentMode string
	if err := tx.QueryRow(`
		SELECT store_id, fulfillment_mode
		FROM dsh_orders
		WHERE id = $1::uuid
		FOR UPDATE`, current.OrderID).Scan(&storeID, &fulfillmentMode); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if fulfillmentMode != "bthwani_delivery" {
		return nil
	}

	if _, err := tx.Exec(`
		UPDATE dsh_store_captain_handoffs
		SET status = 'superseded', version = version + 1, updated_at = NOW()
		WHERE order_id = $1::uuid
		  AND assignment_id <> $2::uuid
		  AND status IN ('awaiting_partner','partner_confirmed')`, current.OrderID, current.ID); err != nil {
		return err
	}

	_, err := tx.Exec(`
		INSERT INTO dsh_store_captain_handoffs (
			order_id, assignment_id, store_id, captain_id, status
		) VALUES ($1::uuid, $2::uuid, $3, $4, 'awaiting_partner')
		ON CONFLICT (assignment_id) DO NOTHING`,
		current.OrderID, current.ID, storeID, current.CaptainID)
	return err
}

func requireStoreCaptainHandoffConfirmed(tx *sql.Tx, assignmentID, captainID string) error {
	var status string
	err := tx.QueryRow(`
		SELECT status
		FROM dsh_store_captain_handoffs
		WHERE assignment_id = $1::uuid AND captain_id = $2
		FOR UPDATE`, assignmentID, captainID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrStoreHandoffRequired
	}
	if err != nil {
		return err
	}
	if status != "partner_confirmed" {
		return ErrStoreHandoffRequired
	}
	return nil
}

func completeStoreCaptainHandoff(tx *sql.Tx, assignmentID, captainID string) error {
	result, err := tx.Exec(`
		UPDATE dsh_store_captain_handoffs
		SET status = 'completed',
		    captain_confirmed_at = NOW(),
		    captain_confirmed_by_actor_id = $2,
		    version = version + 1,
		    updated_at = NOW()
		WHERE assignment_id = $1::uuid
		  AND captain_id = $2
		  AND status = 'partner_confirmed'`, assignmentID, captainID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return ErrStoreHandoffRequired
	}
	return nil
}

// UpdateDeliveryStatusGoverned preserves the existing captain lifecycle while
// enforcing a two-actor custody boundary for platform deliveries.
func UpdateDeliveryStatusGoverned(db *sql.DB, assignmentID, captainID string, status DeliveryStatus) (*Assignment, error) {
	switch status {
	case DeliveryArrivedStore:
		return updateDeliveryProgressWithStoreHandoff(
			db,
			assignmentID,
			captainID,
			[]DeliveryStatus{DeliveryDriverAssigned},
			status,
			orders.StatusArrivedStore,
		)
	case DeliveryPickedUp:
		return updateDeliveryProgressWithStoreHandoff(
			db,
			assignmentID,
			captainID,
			[]DeliveryStatus{DeliveryArrivedStore},
			status,
			orders.StatusPickedUp,
		)
	case DeliveryArrivedCustomer:
		return updateDeliveryProgress(db, assignmentID, captainID, []DeliveryStatus{DeliveryPickedUp}, status, orders.StatusArrivedCustomer)
	default:
		return nil, fmt.Errorf("%w: unsupported delivery status", ErrInvalid)
	}
}

func updateDeliveryProgressWithStoreHandoff(
	db *sql.DB,
	assignmentID string,
	captainID string,
	allowed []DeliveryStatus,
	next DeliveryStatus,
	orderStatus orders.OrderStatus,
) (*Assignment, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	current, err := lockAssignment(tx, assignmentID, captainID)
	if err != nil {
		return nil, err
	}
	if current.Status == AssignmentCancelled || current.Delivery.Status == DeliveryCancelled {
		return nil, fmt.Errorf("%w: assignment was cancelled with the order", ErrConflict)
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

	if current.OrderID != "" && next == DeliveryPickedUp {
		if err = requireStoreCaptainHandoffConfirmed(tx, assignmentID, captainID); err != nil {
			return nil, err
		}
	}
	if current.OrderID != "" && next == DeliveryArrivedStore {
		if err = ensureStoreCaptainHandoff(tx, current); err != nil {
			return nil, err
		}
	}

	if current.OrderID != "" {
		if _, err = orders.TransitionDispatchOrder(
			tx,
			current.OrderID,
			"captain",
			[]orders.OrderStatus{orders.OrderStatus(current.Delivery.Status)},
			orderStatus,
			string(next),
		); err != nil {
			return nil, mapOrderError(err)
		}
	}

	if _, err = tx.Exec(`
		UPDATE dsh_deliveries
		SET status = $1, updated_at = NOW()
		WHERE assignment_id = $2::uuid AND captain_id = $3`, string(next), assignmentID, captainID); err != nil {
		return nil, err
	}
	if current.OrderID != "" && next == DeliveryPickedUp {
		if err = completeStoreCaptainHandoff(tx, assignmentID, captainID); err != nil {
			return nil, err
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return GetCaptainAssignment(db, assignmentID, captainID)
}

func ConfirmStoreCaptainHandoff(db *sql.DB, orderID, storeID, actorID string) (*StoreCaptainHandoff, error) {
	if orderID == "" || storeID == "" || actorID == "" {
		return nil, fmt.Errorf("%w: order, store, and partner actor are required", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var assignmentID, captainID, assignmentStatus, deliveryStatus string
	var resolvedStoreID, fulfillmentMode, orderStatus string
	err = tx.QueryRow(`
		SELECT a.id::text, a.captain_id, a.status, d.status,
		       o.store_id, o.fulfillment_mode, o.status
		FROM dsh_orders o
		JOIN dsh_assignments a ON a.order_id = o.id
		JOIN dsh_deliveries d ON d.assignment_id = a.id
		WHERE o.id = $1::uuid AND a.status = 'accepted'
		ORDER BY a.created_at DESC
		LIMIT 1
		FOR UPDATE OF o, a, d`, orderID).Scan(
		&assignmentID,
		&captainID,
		&assignmentStatus,
		&deliveryStatus,
		&resolvedStoreID,
		&fulfillmentMode,
		&orderStatus,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if resolvedStoreID != storeID {
		return nil, ErrNotFound
	}
	if fulfillmentMode != "bthwani_delivery" {
		return nil, fmt.Errorf("%w: store-captain handoff applies only to bthwani_delivery", ErrConflict)
	}
	if assignmentStatus != string(AssignmentAccepted) ||
		deliveryStatus != string(DeliveryArrivedStore) ||
		orderStatus != string(DeliveryArrivedStore) {
		return nil, fmt.Errorf("%w: captain must be at the store before partner handoff", ErrConflict)
	}

	current := &Assignment{
		ID:        assignmentID,
		OrderID:   orderID,
		CaptainID: captainID,
		Status:    AssignmentAccepted,
		Delivery: Delivery{
			AssignmentID: assignmentID,
			OrderID:      orderID,
			CaptainID:    captainID,
			Status:       DeliveryArrivedStore,
		},
	}
	if err = ensureStoreCaptainHandoff(tx, current); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
		UPDATE dsh_store_captain_handoffs
		SET status = 'partner_confirmed',
		    partner_confirmed_at = COALESCE(partner_confirmed_at, NOW()),
		    partner_confirmed_by_actor_id = COALESCE(partner_confirmed_by_actor_id, $2),
		    version = CASE WHEN status = 'awaiting_partner' THEN version + 1 ELSE version END,
		    updated_at = NOW()
		WHERE assignment_id = $1::uuid
		  AND status IN ('awaiting_partner','partner_confirmed')`, assignmentID, actorID); err != nil {
		return nil, err
	}

	item, err := scanStoreCaptainHandoff(tx.QueryRow(
		storeCaptainHandoffSelect+` WHERE assignment_id = $1::uuid`, assignmentID,
	))
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return item, nil
}
