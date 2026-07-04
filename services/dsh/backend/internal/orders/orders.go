package orders

import (
	"database/sql"
	"errors"
	"fmt"
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
	StoreID          string
	ClientID         string
	Items            []CreateOrderItemInput
}

type CreateOrderItemInput struct {
	ProductID   string
	ProductName string
	Quantity    int
	UnitPrice   float64
}

func CreateOrder(db *sql.DB, input CreateOrderInput) (*Order, error) {
	if input.CheckoutIntentID == "" || input.StoreID == "" || input.ClientID == "" {
		return nil, ErrInvalid
	}
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("%w: at least one item required", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var order Order
	err = tx.QueryRow(`
		INSERT INTO dsh_orders (checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
		VALUES ($1::uuid, $2, $3, $4, $5)
		RETURNING id::text, checkout_intent_id::text, store_id, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		input.CheckoutIntentID, input.StoreID, input.ClientID, string(StatusPending), "",
	).Scan(
		&order.ID, &order.CheckoutIntentID, &order.StoreID, &order.ClientID,
		&order.Status, &order.RejectionReason, &order.WltPaymentRefID,
		&order.CreatedAt, &order.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	for _, item := range input.Items {
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

	_, err = tx.Exec(`
		INSERT INTO dsh_order_status_events (order_id, actor_role, from_status, to_status, note)
		VALUES ($1::uuid, $2, $3, $4, $5)`,
		order.ID, "system", "", string(StatusPending), "order created",
	)
	if err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return &order, nil
}

func GetOrder(db *sql.DB, orderID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, client_id, status,
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

func GetClientOrder(db *sql.DB, orderID, clientID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, client_id, status,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
		FROM dsh_orders
		WHERE id = $1::uuid AND client_id = $2`, orderID, clientID))
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

func ListClientOrders(db *sql.DB, clientID string, limit int) ([]Order, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := db.Query(`
		SELECT id::text, checkout_intent_id::text, store_id, client_id, status,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
		FROM dsh_orders
		WHERE client_id = $1
		ORDER BY created_at DESC
		LIMIT $2`, clientID, limit)
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
		SELECT id::text, checkout_intent_id::text, store_id, client_id, status,
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
			SELECT id::text, checkout_intent_id::text, store_id, client_id, status,
			       COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at
			FROM dsh_orders
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2`, statusFilter, limit)
	} else {
		rows, err = db.Query(`
			SELECT id::text, checkout_intent_id::text, store_id, client_id, status,
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

func AcceptOrder(db *sql.DB, orderID, actorID string) (*Order, error) {
	return transitionOrder(db, orderID, actorID, "partner",
		[]OrderStatus{StatusPending}, StatusStoreAccepted, "")
}

func RejectOrder(db *sql.DB, orderID, actorID, reason string) (*Order, error) {
	if reason == "" {
		return nil, fmt.Errorf("%w: rejection reason is required", ErrInvalid)
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	order, err := scanOrderRow(tx.QueryRow(`
		UPDATE dsh_orders
		SET status = $1, rejection_reason = $2, updated_at = NOW()
		WHERE id = $3::uuid AND status = 'pending'
		RETURNING id::text, checkout_intent_id::text, store_id, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		string(StatusCancelled), reason, orderID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: order not found or already actioned", ErrConflict)
	}
	if err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
		INSERT INTO dsh_order_status_events (order_id, actor_role, from_status, to_status, note)
		VALUES ($1::uuid, $2, $3, $4, $5)`,
		order.ID, "partner", string(StatusPending), string(StatusCancelled), reason); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return order, nil
}

// CancelOrderByOperator lets an operator cancel an order that is stuck before
// dispatch (pending store acceptance or accepted but not yet picked up), e.g.
// when the store is unresponsive and the customer needs a resolution.
func CancelOrderByOperator(db *sql.DB, orderID, actorID, reason string) (*Order, error) {
	if reason == "" {
		return nil, fmt.Errorf("%w: cancellation reason is required", ErrInvalid)
	}
	return transitionOrder(db, orderID, actorID, "operator",
		[]OrderStatus{StatusPending, StatusStoreAccepted}, StatusCancelled, reason)
}

func MarkPreparing(db *sql.DB, orderID, actorID string) (*Order, error) {
	return transitionOrder(db, orderID, actorID, "partner",
		[]OrderStatus{StatusStoreAccepted}, StatusPreparing, "")
}

func MarkReadyForPickup(db *sql.DB, orderID, actorID string) (*Order, error) {
	return transitionOrder(db, orderID, actorID, "partner",
		[]OrderStatus{StatusPreparing}, StatusReadyForPickup, "")
}

func TransitionDispatchOrder(db *sql.Tx, orderID, actorRole string, allowedFrom []OrderStatus, toStatus OrderStatus, note string) (*Order, error) {
	return transitionOrderTx(db, orderID, actorRole, allowedFrom, toStatus, note)
}

func transitionOrder(db *sql.DB, orderID, actorID, actorRole string,
	allowedFrom []OrderStatus, toStatus OrderStatus, note string) (*Order, error) {

	placeholders := make([]string, len(allowedFrom))
	for i, s := range allowedFrom {
		placeholders[i] = fmt.Sprintf("'%s'", string(s))
	}
	inClause := ""
	for i, p := range placeholders {
		if i > 0 {
			inClause += ","
		}
		inClause += p
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

func transitionOrderTx(tx *sql.Tx, orderID, actorRole string,
	allowedFrom []OrderStatus, toStatus OrderStatus, note string) (*Order, error) {

	var fromStatus string
	err := tx.QueryRow(`SELECT status FROM dsh_orders WHERE id = $1::uuid`, orderID).Scan(&fromStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	validFrom := false
	for _, s := range allowedFrom {
		if OrderStatus(fromStatus) == s {
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
		WHERE id = $2::uuid
		RETURNING id::text, checkout_intent_id::text, store_id, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		string(toStatus), orderID))
	if err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
		INSERT INTO dsh_order_status_events (order_id, actor_role, from_status, to_status, note)
		VALUES ($1::uuid, $2, $3, $4, NULLIF($5, ''))`,
		order.ID, actorRole, fromStatus, string(toStatus), note); err != nil {
		return nil, err
	}

	return order, nil
}

func listOrderItems(db *sql.DB, orderID string) ([]OrderItem, error) {
	rows, err := db.Query(`
		SELECT id::text, order_id::text, product_id, product_name, quantity, unit_price
		FROM dsh_order_items
		WHERE order_id = $1::uuid
		ORDER BY product_name`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []OrderItem
	for rows.Next() {
		var item OrderItem
		if err := rows.Scan(&item.ID, &item.OrderID, &item.ProductID, &item.ProductName,
			&item.Quantity, &item.UnitPrice); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []OrderItem{}
	}
	return items, rows.Err()
}

func scanOrderRow(row *sql.Row) (*Order, error) {
	var o Order
	err := row.Scan(
		&o.ID, &o.CheckoutIntentID, &o.StoreID, &o.ClientID,
		&o.Status, &o.RejectionReason, &o.WltPaymentRefID,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func scanOrders(rows *sql.Rows) ([]Order, error) {
	var result []Order
	for rows.Next() {
		var o Order
		if err := rows.Scan(
			&o.ID, &o.CheckoutIntentID, &o.StoreID, &o.ClientID,
			&o.Status, &o.RejectionReason, &o.WltPaymentRefID,
			&o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, o)
	}
	if result == nil {
		result = []Order{}
	}
	return result, rows.Err()
}
