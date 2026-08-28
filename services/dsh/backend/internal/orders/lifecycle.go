package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// TransitionDispatchOrder moves an order through its dispatch lifecycle states.
// The trusted operator context is mandatory: the row lock and the status write
// are both bound to (order_id, operator_context_id) so a cross-context caller
// can never lock, observe or mutate another context's order. Legacy rows
// without an operator context never match and therefore fail closed.
func TransitionDispatchOrder(
	db *sql.Tx,
	operatorContextID,
	orderID,
	actorID,
	actorRole string,
	allowedFrom []OrderStatus,
	toStatus OrderStatus,
	note string,
) (*Order, error) {
	return transitionOrderTx(db, operatorContextID, orderID, actorID, actorRole, allowedFrom, toStatus, note)
}

func transitionOrderTx(
	tx *sql.Tx,
	operatorContextID,
	orderID,
	actorID,
	actorRole string,
	allowedFrom []OrderStatus,
	toStatus OrderStatus,
	note string,
) (*Order, error) {
	actorID = strings.TrimSpace(actorID)
	actorRole = strings.TrimSpace(actorRole)
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" || strings.TrimSpace(orderID) == "" || actorID == "" || actorRole == "" || len(allowedFrom) == 0 {
		return nil, ErrInvalid
	}
	var fromStatus string
	err := tx.QueryRow(`
                SELECT status
                FROM dsh_orders
                WHERE id = $1::uuid AND operator_context_id = $2
                FOR UPDATE`, orderID, operatorContextID).Scan(&fromStatus)
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
                WHERE id = $2::uuid AND status = $3 AND operator_context_id = $4
                RETURNING id::text, COALESCE(operator_context_id, ''), checkout_intent_id::text, store_id, fulfillment_mode, client_id, status, version,
                          COALESCE(rejection_reason, ''), wlt_payment_ref_id, currency, created_at, updated_at`,
		string(toStatus),
		orderID,
		fromStatus,
		operatorContextID,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrConflict
	}
	if err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
                INSERT INTO dsh_order_status_events (order_id, actor_id, actor_role, from_status, to_status, note)
                VALUES ($1::uuid, $2, $3, $4, $5, NULLIF($6, ''))`,
		order.ID,
		actorID,
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
                SELECT id::text, order_id::text, product_id, product_name, quantity, unit_price, currency
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
			&item.Currency,
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
		&order.OperatorContextID,
		&order.CheckoutIntentID,
		&order.StoreID,
		&order.FulfillmentMode,
		&order.ClientID,
		&order.Status,
		&order.Version,
		&order.RejectionReason,
		&order.WltPaymentRefID,
		&order.Currency,
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
			&order.OperatorContextID,
			&order.CheckoutIntentID,
			&order.StoreID,
			&order.FulfillmentMode,
			&order.ClientID,
			&order.Status,
			&order.Version,
			&order.RejectionReason,
			&order.WltPaymentRefID,
			&order.Currency,
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
	CheckoutIntentID    string
	FulfillmentMode     string
	PaymentMethod       string
	PartnerID           string
	WltPaymentSessionID string
}

func GetOrderDeliveryContextForOperatorContext(tx *sql.Tx, operatorContextID, orderID string) (*DeliveryCompletionContext, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, ErrInvalid
	}
	var context DeliveryCompletionContext
	var partnerID sql.NullString
	err := tx.QueryRow(`
                SELECT o.checkout_intent_id::text, ci.fulfillment_mode, ci.payment_method, s.partner_id, ci.wlt_payment_session_id
                FROM dsh_orders o
                JOIN dsh_checkout_intents ci ON ci.id = o.checkout_intent_id
                JOIN dsh_stores s ON s.id = o.store_id
                WHERE o.id = $1::uuid AND o.operator_context_id = $2`,
		orderID, operatorContextID,
	).Scan(&context.CheckoutIntentID, &context.FulfillmentMode, &context.PaymentMethod, &partnerID, &context.WltPaymentSessionID)
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
