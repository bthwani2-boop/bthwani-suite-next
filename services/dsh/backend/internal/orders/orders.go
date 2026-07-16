package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"dsh-api/internal/checkoutfinanceoutbox"
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
}

type CreateOrderItemInput struct {
	ProductID   string
	ProductName string
	Quantity    int
	UnitPrice   float64
}

func CreateOrder(db *sql.DB, input CreateOrderInput) (*Order, error) {
	if input.CheckoutIntentID == "" || input.ClientID == "" {
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
		  AND wlt_payment_session_id <> ''
		  AND (
		        (state = 'payment_pending' AND payment_method = 'cod')
		        OR state = 'payment_confirmed'
		      )`,
		input.CheckoutIntentID, input.ClientID,
	).Scan(&cartID, &storeID, &wltPaymentSessionID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: checkout intent is not ready for order creation", ErrConflict)
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
	defer rows.Close()

	var items []CreateOrderItemInput
	for rows.Next() {
		var item CreateOrderItemInput
		if err := rows.Scan(&item.ProductID, &item.ProductName, &item.UnitPrice, &item.Quantity); err != nil {
			return nil, err
		}
		if item.UnitPrice <= 0 {
			return nil, fmt.Errorf("%w: cart item is missing a price snapshot", ErrInvalid)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("%w: checkout cart has no items", ErrInvalid)
	}

	var order Order
	err = tx.QueryRow(`
		INSERT INTO dsh_orders (checkout_intent_id, store_id, fulfillment_mode, client_id, status, wlt_payment_ref_id)
		VALUES ($1::uuid, $2, (SELECT fulfillment_mode FROM dsh_checkout_intents WHERE id = $1::uuid), $3, $4, $5)
		RETURNING id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
		          COALESCE(rejection_reason, ''), wlt_payment_ref_id, created_at, updated_at`,
		input.CheckoutIntentID, storeID, input.ClientID, string(StatusPending), wltPaymentSessionID,
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

	_, err = tx.Exec(`
		INSERT INTO dsh_order_status_events (order_id, actor_role, from_status, to_status, note)
		VALUES ($1::uuid, $2, $3, $4, $5)`,
		order.ID, "system", "", string(StatusPending), "order created",
	)
	if err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
		UPDATE dsh_checkout_intents
		SET state = 'confirmed', version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid AND client_id = $2`,
		input.CheckoutIntentID, input.ClientID,
	); err != nil {
		return nil, err
	}

	if _, err = tx.Exec(`
		UPDATE dsh_carts
		SET state = 'checked_out', version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid`, cartID,
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

func GetClientOrder(db *sql.DB, orderID, clientID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
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
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
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
		RETURNING id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
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

	if err = enqueueOrderFinancialClosure(tx, order, reason); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return order, nil
}

// enqueueOrderFinancialClosure enqueues a durable cancel_for_order outbox
// event, inside the same transaction that commits the order rejection/
// cancellation, whenever the order has a WLT payment session reference.
// Without this, rejecting/cancelling an order never triggers any WLT
// financial action, even though the linkage (wlt_payment_ref_id) is already
// available on the order row.
func enqueueOrderFinancialClosure(tx *sql.Tx, order *Order, reason string) error {
	if order.WltPaymentRefID == "" {
		return nil
	}
	orderID := order.ID
	return checkoutfinanceoutbox.Enqueue(tx, checkoutfinanceoutbox.EnqueueInput{
		EventType:        checkoutfinanceoutbox.EventTypeCancelForOrder,
		CheckoutIntentID: order.CheckoutIntentID,
		PaymentSessionID: order.WltPaymentRefID,
		OrderID:          &orderID,
		ClientID:         order.ClientID,
		Reason:           reason,
	})
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
		RETURNING id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status,
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

	// Cancelling an order (e.g. CancelOrderByOperator) must also close out
	// any WLT payment session tied to it. Other transitions driven through
	// this shared helper (accept, prepare, dispatch, deliver, ...) never move
	// to StatusCancelled, so this only fires on the cancellation path.
	if toStatus == StatusCancelled {
		if err = enqueueOrderFinancialClosure(tx, order, note); err != nil {
			return nil, err
		}
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
		&o.ID, &o.CheckoutIntentID, &o.StoreID, &o.FulfillmentMode, &o.ClientID,
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
			&o.ID, &o.CheckoutIntentID, &o.StoreID, &o.FulfillmentMode, &o.ClientID,
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

// DeliveryCompletionContext carries only the identifiers WLT needs to settle
// a delivered order's COD collection: DSH never computes or forwards the
// financial amount itself (WLT re-derives it from its own payment session).
type DeliveryCompletionContext struct {
	CheckoutIntentID string
	PaymentMethod    string
	PartnerID        string
}

// GetOrderDeliveryContext resolves the checkout intent, payment method, and
// owning partner for an order, so the dispatch layer can decide whether (and
// how) to notify WLT once a delivery is marked complete. It takes the same
// transaction that confirms the delivery so the lookup and the outbox write
// that follows it are atomic with the delivery confirmation.
func GetOrderDeliveryContext(tx *sql.Tx, orderID string) (*DeliveryCompletionContext, error) {
	var ctx DeliveryCompletionContext
	var partnerID sql.NullString
	err := tx.QueryRow(`
		SELECT o.checkout_intent_id::text, ci.payment_method, s.partner_id
		FROM dsh_orders o
		JOIN dsh_checkout_intents ci ON ci.id = o.checkout_intent_id
		JOIN dsh_stores s ON s.id = o.store_id
		WHERE o.id = $1::uuid`,
		orderID,
	).Scan(&ctx.CheckoutIntentID, &ctx.PaymentMethod, &partnerID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if partnerID.Valid {
		ctx.PartnerID = partnerID.String
	}
	return &ctx, nil
}
