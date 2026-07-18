package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("order not found")
	ErrInvalid  = errors.New("invalid order input")
	ErrConflict = errors.New("order state conflict")
)

type OrderStatus string

const (
	StatusPending         OrderStatus = "pending"
	StatusStoreAccepted   OrderStatus = "store_accepted"
	StatusPreparing       OrderStatus = "preparing"
	StatusReadyForPickup  OrderStatus = "ready_for_pickup"
	StatusDriverAssigned  OrderStatus = "driver_assigned"
	StatusArrivedStore    OrderStatus = "driver_arrived_store"
	StatusPickedUp        OrderStatus = "picked_up"
	StatusArrivedCustomer OrderStatus = "arrived_customer"
	StatusDelivered       OrderStatus = "delivered"
	StatusCancelled       OrderStatus = "cancelled"
)

type OrderItem struct {
	ID          string
	OrderID     string
	ProductID   string
	ProductName string
	Quantity    int
	UnitPrice   float64
}

type Order struct {
	ID               string
	CheckoutIntentID string
	StoreID          string
	FulfillmentMode  string
	ClientID         string
	Status           OrderStatus
	RejectionReason  string
	WltPaymentRefID  string
	Items            []OrderItem
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type CreateOrderInput struct {
	CheckoutIntentID string
	ClientID         string
	TenantID         string
}

type CreateOrderItemInput struct {
	ProductID   string
	ProductName string
	Quantity    int
	UnitPrice   float64
}

func CreateOrder(db *sql.DB, input CreateOrderInput) (*Order, error) {
	input.TenantID = strings.TrimSpace(input.TenantID)
	if input.CheckoutIntentID == "" || input.ClientID == "" || input.TenantID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var cartID, storeID, wltPaymentSessionID string
	err = tx.QueryRow(`
		SELECT cart_id::text, store_id, wlt_payment_session_id
		FROM dsh_checkout_intents
		WHERE id = $1::uuid
		  AND client_id = $2
		  AND tenant_id = $3
		  AND wlt_payment_session_id <> ''
		  AND (
		        (state = 'payment_pending' AND payment_method = 'cod')
		        OR state = 'payment_confirmed'
		      )
		FOR UPDATE`,
		input.CheckoutIntentID, input.ClientID, input.TenantID,
	).Scan(&cartID, &storeID, &wltPaymentSessionID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: checkout intent is not ready for order creation in tenant", ErrConflict)
	}
	if err != nil {
		return nil, err
	}

	rows, err := tx.Query(`
		SELECT product_id, product_name, unit_price, quantity
		FROM dsh_cart_items
		WHERE cart_id = $1::uuid
		ORDER BY created_at`, cartID)
	if err != nil {
		return nil, err
	}

	var items []CreateOrderItemInput
	for rows.Next() {
		var item CreateOrderItemInput
		if err := rows.Scan(&item.ProductID, &item.ProductName, &item.UnitPrice, &item.Quantity); err != nil {
			rows.Close()
			return nil, err
		}
		if item.UnitPrice <= 0 || item.Quantity <= 0 {
			rows.Close()
			return nil, fmt.Errorf("%w: cart item is missing a price snapshot", ErrInvalid)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: checkout cart has no items", ErrInvalid)
	}

	var order Order
	err = tx.QueryRow(`
		INSERT INTO dsh_orders (checkout_intent_id, store_id, fulfillment_mode, client_id, status, wlt_payment_ref_id)
		VALUES ($1::uuid, $2, (SELECT fulfillment_mode FROM dsh_checkout_intents WHERE id = $1::uuid AND tenant_id=$3), $4, $5, $6)
		RETURNING id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		input.CheckoutIntentID, storeID, input.TenantID, input.ClientID, string(StatusPending), wltPaymentSessionID,
	).Scan(
		&order.ID, &order.CheckoutIntentID, &order.StoreID, &order.FulfillmentMode, &order.ClientID,
		&order.Status, &order.RejectionReason, &order.WltPaymentRefID,
		&order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	for _, item := range items {
		var orderItem OrderItem
		err = tx.QueryRow(`
			INSERT INTO dsh_order_items (order_id, product_id, product_name, quantity, unit_price)
			VALUES ($1::uuid, $2, $3, $4, $5)
			RETURNING id::text, order_id::text, product_id, product_name, quantity, unit_price`,
			order.ID, item.ProductID, item.ProductName, item.Quantity, item.UnitPrice,
		).Scan(
			&orderItem.ID, &orderItem.OrderID, &orderItem.ProductID,
			&orderItem.ProductName, &orderItem.Quantity, &orderItem.UnitPrice,
		)
		if err != nil {
			return nil, err
		}
		order.Items = append(order.Items, orderItem)
	}

	if _, err = tx.Exec(`
		INSERT INTO dsh_order_status_events (order_id, actor_role, from_status, to_status, note)
		VALUES ($1::uuid, $2, $3, $4, $5)`,
		order.ID, "system", "", string(StatusPending), "order created",
	); err != nil {
		return nil, err
	}

	result, err := tx.Exec(`
		UPDATE dsh_checkout_intents
		SET state = 'confirmed', version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid AND tenant_id=$2 AND client_id = $3
		  AND state IN ('payment_pending','payment_confirmed')`,
		input.CheckoutIntentID, input.TenantID, input.ClientID,
	)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, fmt.Errorf("%w: checkout state changed concurrently", ErrConflict)
	}

	if _, err = tx.Exec(`
		UPDATE dsh_carts
		SET state = 'checked_out', version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid AND state='active'`, cartID,
	); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &order, nil
}

func GetOrder(db *sql.DB, orderID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
		FROM dsh_orders
		WHERE id = $1::uuid`, orderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	items, err := listOrderItems(db, order.ID)
	if err != nil {
		return nil, err
	}
	order.Items = items
	return order, nil
}

func GetClientOrder(db *sql.DB, orderID, tenantID, clientID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
		FROM dsh_orders
		WHERE id = $1::uuid AND tenant_id=$2 AND client_id = $3`, orderID, tenantID, clientID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	items, err := listOrderItems(db, order.ID)
	if err != nil {
		return nil, err
	}
	order.Items = items
	return order, nil
}

func ListClientOrders(db *sql.DB, tenantID, clientID string, limit int) ([]Order, error) {
	if strings.TrimSpace(tenantID) == "" || clientID == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.Query(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
		FROM dsh_orders
		WHERE tenant_id=$1 AND client_id = $2
		ORDER BY created_at DESC
		LIMIT $3`, tenantID, clientID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}

func ListPartnerOrders(db *sql.DB, storeID, statusFilter string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if statusFilter == "" {
		statusFilter = string(StatusPending)
	}
	rows, err := db.Query(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
		FROM dsh_orders
		WHERE store_id = $1 AND status = $2
		ORDER BY created_at ASC
		LIMIT $3`, storeID, statusFilter, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}

func ListOperatorOrders(db *sql.DB, statusFilter string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var (
		rows *sql.Rows
		err  error
	)
	if statusFilter != "" {
		rows, err = db.Query(`
			SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
			       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
			FROM dsh_orders
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2`, statusFilter, limit)
	} else {
		rows, err = db.Query(`
			SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
			       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
			FROM dsh_orders
			ORDER BY created_at DESC
			LIMIT $1`, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOrders(rows)
}
