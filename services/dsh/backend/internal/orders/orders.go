package orders

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound = errors.New("order not found")
	ErrInvalid  = errors.New("invalid order input")
	ErrConflict = errors.New("order state conflict")
)

type OrderStatus string

const (
	StatusPending            OrderStatus = "pending"
	StatusStoreAccepted      OrderStatus = "store_accepted"
	StatusPreparing          OrderStatus = "preparing"
	StatusReadyForPickup     OrderStatus = "ready_for_pickup"
	StatusDriverAssigned     OrderStatus = "driver_assigned"
	StatusArrivedStore       OrderStatus = "driver_arrived_store"
	StatusPickedUp           OrderStatus = "picked_up"
	StatusArrivedCustomer    OrderStatus = "arrived_customer"
	StatusReturningStore     OrderStatus = "returning_to_store"
	StatusReturnArrivedStore OrderStatus = "return_arrived_store"
	StatusReturnedStore      OrderStatus = "returned_to_store"
	StatusDelivered          OrderStatus = "delivered"
	StatusCancelled          OrderStatus = "cancelled"
)

type OrderItem struct {
	ID          string
	OrderID     string
	ProductID   string
	ProductName string
	Quantity    int
	UnitPrice   float64
	Currency    string
}

type Order struct {
	ID               string
	CheckoutIntentID string
	StoreID          string
	FulfillmentMode  string
	ClientID         string
	Status           OrderStatus
	Version          int
	RejectionReason  string
	WltPaymentRefID  string
	Currency         string
	Items            []OrderItem
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func GetOrder(db *sql.DB, orderID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status, version,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, currency, created_at, updated_at
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
func GetClientOrder(db *sql.DB, orderID, operatorContextID, clientID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status, version,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, currency, created_at, updated_at
		FROM dsh_orders
		WHERE id = $1::uuid AND operator_context_id=$2 AND client_id = $3`, orderID, operatorContextID, clientID))
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

func GetOrderForContext(db *sql.DB, operatorContextID, orderID string) (*Order, error) {
	order, err := scanOrderRow(db.QueryRow(`
		SELECT id::text, checkout_intent_id::text, store_id, fulfillment_mode, client_id, status, version,
		       COALESCE(rejection_reason, ''), wlt_payment_ref_id, currency, created_at, updated_at
		FROM dsh_orders
		WHERE id = $1::uuid AND operator_context_id = $2`, orderID, operatorContextID))
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
