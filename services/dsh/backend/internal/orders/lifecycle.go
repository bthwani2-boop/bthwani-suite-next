package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// AcceptOrder is the compatibility entry point used by existing HTTP routes.
// It delegates to the JRN-012 implementation so acceptance always initializes
// the store policy snapshot and authoritative preparation SLA timestamps.
func AcceptOrder(db *sql.DB, orderID, actorID string) (*Order, error) {
	return AcceptOrderWithPreparation(db, orderID, actorID)
}

// RejectOrder is retained as a compatibility entry point. It delegates to the
// governed cancellation runtime so no caller can write the obsolete generic
// cancelled status or bypass financial closure.
func RejectOrder(db *sql.DB, orderID, actorID, reason string) (*Order, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("%w: rejection reason is required", ErrInvalid)
	}
	return CancelOrder(db, CancellationInput{
		OrderID:       orderID,
		ActorID:       actorID,
		ActorRole:     "partner",
		ReasonCode:    "other",
		ReasonNote:    reason,
		CorrelationID: "partner-reject:" + orderID,
	})
}

// CancelOrderByOperator is retained for existing callers and routes every
// mutation through the same cancellation record, task shutdown and WLT outbox.
func CancelOrderByOperator(db *sql.DB, orderID, actorID, reason string) (*Order, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("%w: cancellation reason is required", ErrInvalid)
	}
	return CancelOrder(db, CancellationInput{
		OrderID:       orderID,
		ActorID:       actorID,
		ActorRole:     "operator",
		ReasonCode:    "other",
		ReasonNote:    reason,
		CorrelationID: "operator-cancel:" + orderID,
	})
}

// MarkPreparing is the compatibility entry point used by partner surfaces.
// The governed implementation records preparation_started_at atomically with
// the lifecycle transition.
func MarkPreparing(db *sql.DB, orderID, actorID string) (*Order, error) {
	return MarkPreparingWithTiming(db, orderID, actorID)
}

// MarkReadyForPickup delegates to the governed timing implementation so
// ready_at and the final SLA state cannot diverge from the order lifecycle.
func MarkReadyForPickup(db *sql.DB, orderID, actorID string) (*Order, error) {
	return MarkReadyWithTiming(db, orderID, actorID)
}

func TransitionDispatchOrder(
	db *sql.Tx,
	orderID,
	actorRole string,
	allowedFrom []OrderStatus,
	toStatus OrderStatus,
	note string,
) (*Order, error) {
	return transitionOrderTx(db, orderID, actorRole, allowedFrom, toStatus, note)
}

func transitionOrder(
	db *sql.DB,
	orderID,
	actorID,
	actorRole string,
	allowedFrom []OrderStatus,
	toStatus OrderStatus,
	note string,
) (*Order, error) {
	if orderID == "" || actorID == "" || actorRole == "" || len(allowedFrom) == 0 {
		return nil, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	order, err := transitionOrderTx(tx, orderID, actorRole, allowedFrom, toStatus, note)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return order, nil
}

func transitionOrderTx(
	tx *sql.Tx,
	orderID,
	actorRole string,
	allowedFrom []OrderStatus,
	toStatus OrderStatus,
	note string,
) (*Order, error) {
	var fromStatus string
	err := tx.QueryRow(`
		SELECT status
		FROM dsh_orders
		WHERE id = $1::uuid
		FOR UPDATE`, orderID).Scan(&fromStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	validFrom := false
	for _, status := range allowedFrom {
		if OrderStatus(fromStatus) == status {
			validFrom = true
			break
		}
	}
	if !validFrom {
		return nil, fmt.Errorf("%w: cannot transition from %s to %s", ErrConflict, fromStatus, toStatus)
	}

	order, err := scanOrderRow(tx.QueryRow(`
		UPDATE dsh_orders
		SET status = $1, updated_at = NOW()
		WHERE id = $2::uuid AND status = $3
		RETURNING id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		string(toStatus),
		orderID,
		fromStatus,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
		INSERT INTO dsh_order_status_events (order_id, actor_role, from_status, to_status, note)
		VALUES ($1::uuid, $2, $3, $4, NULLIF($5, ''))`,
		order.ID,
		actorRole,
		fromStatus,
		string(toStatus),
		note,
	); err != nil {
		return nil, err
	}
	return order, nil
}

func listOrderItems(db *sql.DB, orderID string) ([]OrderItem, error) {
	rows, err := db.Query(`
		SELECT id::text, order_id::text, product_id, product_name, quantity, unit_price
		FROM dsh_order_items
		WHERE order_id = $1::uuid
		ORDER BY created_at, id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]OrderItem, 0)
	for rows.Next() {
		var item OrderItem
		if err := rows.Scan(
			&item.ID,
			&item.OrderID,
			&item.ProductID,
			&item.ProductName,
			&item.Quantity,
			&item.UnitPrice,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanOrderRow(row *sql.Row) (*Order, error) {
	var order Order
	err := row.Scan(
		&order.ID,
		&order.CheckoutIntentID,
		&order.StoreID,
		&order.FulfillmentMode,
		&order.ClientID,
		&order.Status,
		&order.RejectionReason,
		&order.WltPaymentRefID,
		&order.CreatedAt,
		&order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func scanOrders(rows *sql.Rows) ([]Order, error) {
	result := make([]Order, 0)
	for rows.Next() {
		var order Order
		if err := rows.Scan(
			&order.ID,
			&order.CheckoutIntentID,
			&order.StoreID,
			&order.FulfillmentMode,
			&order.ClientID,
			&order.Status,
			&order.RejectionReason,
			&order.WltPaymentRefID,
			&order.CreatedAt,
			&order.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, order)
	}
	return result, rows.Err()
}

type DeliveryCompletionContext struct {
	CheckoutIntentID string
	PaymentMethod    string
	PartnerID        string
}

func GetOrderDeliveryContext(tx *sql.Tx, orderID string) (*DeliveryCompletionContext, error) {
	var context DeliveryCompletionContext
	var partnerID sql.NullString
	err := tx.QueryRow(`
		SELECT o.checkout_intent_id::text, ci.payment_method, s.partner_id
		FROM dsh_orders o
		JOIN dsh_checkout_intents ci ON ci.id = o.checkout_intent_id
		JOIN dsh_stores s ON s.id = o.store_id
		WHERE o.id = $1::uuid`,
		orderID,
	).Scan(&context.CheckoutIntentID, &context.PaymentMethod, &partnerID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if partnerID.Valid {
		context.PartnerID = partnerID.String
	}
	return &context, nil
}
