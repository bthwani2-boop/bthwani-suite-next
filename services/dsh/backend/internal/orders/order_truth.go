package orders

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrIdempotencyConflict = errors.New("order idempotency conflict")

type CreateOrderTruthInput struct {
	CheckoutIntentID string
	ClientID         string
	TenantID         string
	IdempotencyKey   string
	CorrelationID    string
}

type OrderTruthItem struct {
	ID                  string          `json:"id"`
	ProductID           string          `json:"productId"`
	ProductName         string          `json:"productName"`
	Quantity            int             `json:"quantity"`
	UnitPrice           float64         `json:"unitPrice"`
	LineTotalMinorUnits int64           `json:"lineTotalMinorUnits"`
	Snapshot            json.RawMessage `json:"snapshot"`
}

type OrderTruthEvent struct {
	ID            string          `json:"id"`
	Type          string          `json:"type"`
	ActorRole     string          `json:"actorRole"`
	FromStatus    string          `json:"fromStatus"`
	ToStatus      string          `json:"toStatus"`
	CorrelationID string          `json:"correlationId"`
	CausationID   string          `json:"causationId"`
	OrderVersion  int             `json:"orderVersion"`
	Metadata      json.RawMessage `json:"metadata"`
	CreatedAt     time.Time       `json:"createdAt"`
}

type OrderTruth struct {
	ID                         string            `json:"id"`
	OrderNumber                string            `json:"orderNumber"`
	CheckoutIntentID           string            `json:"checkoutIntentId"`
	StoreID                    string            `json:"storeId"`
	ClientID                   string            `json:"clientId,omitempty"`
	FulfillmentMode            string            `json:"fulfillmentMode"`
	Status                     OrderStatus       `json:"status"`
	CurrentOwner               string            `json:"currentOwner"`
	AllowedActions             []string          `json:"allowedActions"`
	DeliveryAddressSnapshot    json.RawMessage   `json:"deliveryAddressSnapshot"`
	SubtotalMinorUnits         int64             `json:"subtotalMinorUnits"`
	DiscountMinorUnits         int64             `json:"discountMinorUnits"`
	TotalMinorUnits            int64             `json:"totalMinorUnits"`
	Currency                   string            `json:"currency"`
	PricingSnapshotHash        string            `json:"pricingSnapshotHash"`
	CouponCodeLast4            string            `json:"couponCodeLast4,omitempty"`
	WltPaymentRefID            string            `json:"wltPaymentRefId"`
	PaymentStatusProjection    string            `json:"paymentStatusProjection"`
	PaymentProjectionUpdatedAt *time.Time        `json:"paymentProjectionUpdatedAt,omitempty"`
	CorrelationID              string            `json:"correlationId"`
	Version                    int               `json:"version"`
	Items                      []OrderTruthItem  `json:"items"`
	StatusTimeline             []OrderTruthEvent `json:"statusTimeline"`
	CreatedAt                  time.Time         `json:"createdAt"`
	UpdatedAt                  time.Time         `json:"updatedAt"`
}

func orderCreateFingerprint(checkoutIntentID string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(checkoutIntentID)))
	return hex.EncodeToString(sum[:])
}

func CreateOrderTruth(db *sql.DB, input CreateOrderTruthInput) (*OrderTruth, bool, error) {
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.CheckoutIntentID == "" || input.ClientID == "" || input.TenantID == "" || len(input.IdempotencyKey) < 16 || len(input.IdempotencyKey) > 200 {
		return nil, false, ErrInvalid
	}
	if input.CorrelationID == "" {
		input.CorrelationID = "order-create:" + input.IdempotencyKey
	}
	if len(input.CorrelationID) > 200 {
		return nil, false, ErrInvalid
	}
	fingerprint := orderCreateFingerprint(input.CheckoutIntentID)

	tx, err := db.Begin()
	if err != nil {
		return nil, false, err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, input.TenantID+"|"+input.ClientID+"|"+input.IdempotencyKey); err != nil {
		return nil, false, err
	}

	var existingFingerprint string
	var existingOrderID sql.NullString
	err = tx.QueryRow(`
		SELECT request_fingerprint, order_id::text
		FROM dsh_order_create_idempotency
		WHERE tenant_id=$1 AND client_id=$2 AND idempotency_key=$3
		FOR UPDATE`, input.TenantID, input.ClientID, input.IdempotencyKey,
	).Scan(&existingFingerprint, &existingOrderID)
	if err == nil {
		if existingFingerprint != fingerprint {
			return nil, false, ErrIdempotencyConflict
		}
		if existingOrderID.Valid && existingOrderID.String != "" {
			truth, readErr := getOrderTruthTx(tx, existingOrderID.String, input.TenantID, "client")
			if readErr != nil {
				return nil, false, readErr
			}
			if truth.ClientID != input.ClientID {
				return nil, false, ErrConflict
			}
			if commitErr := tx.Commit(); commitErr != nil {
				return nil, false, commitErr
			}
			return truth, true, nil
		}
		return nil, false, fmt.Errorf("%w: prior order creation is incomplete", ErrConflict)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	// Verify actor ownership before any checkout-level replay lookup. This keeps
	// a guessed Checkout Intent ID from becoming a cross-client existence or
	// order read oracle inside the same tenant.
	var ownedCheckout int
	err = tx.QueryRow(`
		SELECT 1
		FROM dsh_checkout_intents
		WHERE id=$1::uuid AND tenant_id=$2 AND client_id=$3
		FOR SHARE`, input.CheckoutIntentID, input.TenantID, input.ClientID,
	).Scan(&ownedCheckout)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, fmt.Errorf("%w: checkout intent is inaccessible", ErrConflict)
	}
	if err != nil {
		return nil, false, err
	}

	// A retry may arrive with a replacement key after the original key was
	// lost. The actor-scoped checkout row is locked before inserting a second
	// attempt, so the unique tenant/checkout constraint never becomes an oracle.
	var checkoutAttemptOrderID sql.NullString
	err = tx.QueryRow(`
		SELECT order_id::text
		FROM dsh_order_create_idempotency
		WHERE tenant_id=$1 AND client_id=$2 AND checkout_intent_id=$3::uuid
		FOR UPDATE`, input.TenantID, input.ClientID, input.CheckoutIntentID,
	).Scan(&checkoutAttemptOrderID)
	if err == nil {
		if checkoutAttemptOrderID.Valid && checkoutAttemptOrderID.String != "" {
			truth, readErr := getOrderTruthTx(tx, checkoutAttemptOrderID.String, input.TenantID, "client")
			if readErr != nil {
				return nil, false, readErr
			}
			if truth.ClientID != input.ClientID {
				return nil, false, ErrConflict
			}
			if commitErr := tx.Commit(); commitErr != nil {
				return nil, false, commitErr
			}
			return truth, true, nil
		}
		return nil, false, fmt.Errorf("%w: checkout already has an incomplete creation attempt", ErrConflict)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	if _, err = tx.Exec(`
		INSERT INTO dsh_order_create_idempotency
		(tenant_id, client_id, idempotency_key, checkout_intent_id, request_fingerprint, correlation_id)
		VALUES ($1,$2,$3,$4::uuid,$5,$6)`,
		input.TenantID, input.ClientID, input.IdempotencyKey, input.CheckoutIntentID, fingerprint, input.CorrelationID,
	); err != nil {
		return nil, false, err
	}

	var cartID, storeID, fulfillmentMode, wltPaymentRefID, checkoutState, paymentMethod string
	err = tx.QueryRow(`
		SELECT cart_id::text, store_id, fulfillment_mode, wlt_payment_session_id, state, payment_method
		FROM dsh_checkout_intents
		WHERE id=$1::uuid AND tenant_id=$2 AND client_id=$3 AND wlt_payment_session_id<>''
		FOR UPDATE`, input.CheckoutIntentID, input.TenantID, input.ClientID,
	).Scan(&cartID, &storeID, &fulfillmentMode, &wltPaymentRefID, &checkoutState, &paymentMethod)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, fmt.Errorf("%w: checkout intent is inaccessible", ErrConflict)
	}
	if err != nil {
		return nil, false, err
	}
	eligible := checkoutState == "payment_confirmed" || (checkoutState == "payment_pending" && paymentMethod == "cod")
	if !eligible {
		return nil, false, fmt.Errorf("%w: checkout intent is not eligible for order creation", ErrConflict)
	}

	// Legacy orders created before the JRN-011 attempt table are recovered
	// without a duplicate insert and are bound to this durable attempt.
	var legacyOrderID string
	err = tx.QueryRow(`
		SELECT id::text FROM dsh_orders
		WHERE tenant_id=$1 AND client_id=$2 AND checkout_intent_id=$3::uuid
		FOR UPDATE`, input.TenantID, input.ClientID, input.CheckoutIntentID,
	).Scan(&legacyOrderID)
	if err == nil {
		if _, bindErr := tx.Exec(`
			UPDATE dsh_order_create_idempotency
			SET order_id=$1::uuid, completed_at=NOW()
			WHERE tenant_id=$2 AND client_id=$3 AND idempotency_key=$4`,
			legacyOrderID, input.TenantID, input.ClientID, input.IdempotencyKey,
		); bindErr != nil {
			return nil, false, bindErr
		}
		truth, readErr := getOrderTruthTx(tx, legacyOrderID, input.TenantID, "client")
		if readErr != nil {
			return nil, false, readErr
		}
		if commitErr := tx.Commit(); commitErr != nil {
			return nil, false, commitErr
		}
		return truth, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}

	rows, err := tx.Query(`
		SELECT product_id, product_name, unit_price, quantity
		FROM dsh_cart_items WHERE cart_id=$1::uuid ORDER BY created_at, id`, cartID)
	if err != nil {
		return nil, false, err
	}
	type sourceItem struct {
		productID, productName string
		unitPrice              float64
		quantity               int
	}
	items := make([]sourceItem, 0)
	for rows.Next() {
		var item sourceItem
		if scanErr := rows.Scan(&item.productID, &item.productName, &item.unitPrice, &item.quantity); scanErr != nil {
			rows.Close()
			return nil, false, scanErr
		}
		if item.quantity <= 0 || item.unitPrice <= 0 {
			rows.Close()
			return nil, false, fmt.Errorf("%w: invalid cart item snapshot", ErrInvalid)
		}
		items = append(items, item)
	}
	if err = rows.Err(); err != nil {
		rows.Close()
		return nil, false, err
	}
	rows.Close()
	if len(items) == 0 {
		return nil, false, fmt.Errorf("%w: checkout cart has no items", ErrInvalid)
	}

	var orderID string
	err = tx.QueryRow(`
		INSERT INTO dsh_orders
		(tenant_id, checkout_intent_id, store_id, fulfillment_mode, client_id, status, wlt_payment_ref_id, correlation_id)
		VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8)
		RETURNING id::text`,
		input.TenantID, input.CheckoutIntentID, storeID, fulfillmentMode, input.ClientID, string(StatusPending), wltPaymentRefID, input.CorrelationID,
	).Scan(&orderID)
	if err != nil {
		return nil, false, err
	}

	for _, item := range items {
		snapshot, marshalErr := json.Marshal(map[string]any{
			"productId":   item.productID,
			"productName": item.productName,
			"quantity":    item.quantity,
			"unitPrice":   item.unitPrice,
		})
		if marshalErr != nil {
			return nil, false, marshalErr
		}
		lineMinor := int64(item.unitPrice*100+0.5) * int64(item.quantity)
		if _, err = tx.Exec(`
			INSERT INTO dsh_order_items
			(order_id, product_id, product_name, quantity, unit_price, item_snapshot, line_total_minor_units)
			VALUES ($1::uuid,$2,$3,$4,$5,$6::jsonb,$7)`,
			orderID, item.productID, item.productName, item.quantity, item.unitPrice, string(snapshot), lineMinor,
		); err != nil {
			return nil, false, err
		}
	}

	var eventID string
	eventMetadata := `{"source":"checkout","immutableSnapshot":true}`
	err = tx.QueryRow(`
		INSERT INTO dsh_order_status_events
		(order_id, tenant_id, actor_role, actor_id, from_status, to_status, note, event_type, correlation_id, causation_id, order_version, metadata)
		VALUES ($1::uuid,$2,'system','',$3,$4,'order created from eligible checkout','order.created',$5,$6,1,$7::jsonb)
		RETURNING id::text`, orderID, input.TenantID, "", string(StatusPending), input.CorrelationID, input.CheckoutIntentID, eventMetadata,
	).Scan(&eventID)
	if err != nil {
		return nil, false, err
	}

	// dsh-903 creates this row through a trigger. ON CONFLICT keeps the code
	// compatible with deployments where the trigger is temporarily disabled.
	if _, err = tx.Exec(`
		INSERT INTO dsh_order_event_outbox
		(tenant_id, order_id, event_id, event_type, correlation_id, causation_id, payload)
		VALUES ($1,$2::uuid,$3::uuid,'order.created',$4,$5,
		jsonb_build_object('orderId',$2::text,'checkoutIntentId',$5::text,'correlationId',$4::text,'version',1))
		ON CONFLICT (tenant_id,event_id) DO NOTHING`,
		input.TenantID, orderID, eventID, input.CorrelationID, input.CheckoutIntentID,
	); err != nil {
		return nil, false, err
	}

	result, err := tx.Exec(`
		UPDATE dsh_checkout_intents
		SET state='confirmed', version=version+1, updated_at=NOW()
		WHERE id=$1::uuid AND tenant_id=$2 AND client_id=$3
		  AND state IN ('payment_pending','payment_confirmed')`,
		input.CheckoutIntentID, input.TenantID, input.ClientID,
	)
	if err != nil {
		return nil, false, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, false, fmt.Errorf("%w: checkout changed concurrently", ErrConflict)
	}
	if _, err = tx.Exec(`
		UPDATE dsh_carts
		SET state='checked_out', version=version+1, updated_at=NOW()
		WHERE id=$1::uuid AND client_id=$2 AND state='active'`, cartID, input.ClientID,
	); err != nil {
		return nil, false, err
	}
	if _, err = tx.Exec(`
		UPDATE dsh_order_create_idempotency
		SET order_id=$1::uuid, completed_at=NOW()
		WHERE tenant_id=$2 AND client_id=$3 AND idempotency_key=$4`,
		orderID, input.TenantID, input.ClientID, input.IdempotencyKey,
	); err != nil {
		return nil, false, err
	}

	truth, err := getOrderTruthTx(tx, orderID, input.TenantID, "client")
	if err != nil {
		return nil, false, err
	}
	if err = tx.Commit(); err != nil {
		return nil, false, err
	}
	return truth, false, nil
}

func GetOrderTruth(db *sql.DB, orderID, tenantID, viewerRole string) (*OrderTruth, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	truth, err := getOrderTruthTx(tx, orderID, tenantID, viewerRole)
	if err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return truth, nil
}

func getOrderTruthTx(tx *sql.Tx, orderID, tenantID, viewerRole string) (*OrderTruth, error) {
	var truth OrderTruth
	var address []byte
	var paymentUpdated sql.NullTime
	err := tx.QueryRow(`
		SELECT id::text, order_number, checkout_intent_id::text, store_id, client_id,
		       fulfillment_mode, status, delivery_address_snapshot, subtotal_minor_units,
		       discount_minor_units, total_minor_units, currency, pricing_snapshot_hash,
		       coupon_code_last4, wlt_payment_ref_id, payment_status_projection,
		       payment_projection_updated_at, correlation_id, version, created_at, updated_at
		FROM dsh_orders WHERE id=$1::uuid AND tenant_id=$2`, orderID, tenantID,
	).Scan(&truth.ID, &truth.OrderNumber, &truth.CheckoutIntentID, &truth.StoreID, &truth.ClientID,
		&truth.FulfillmentMode, &truth.Status, &address, &truth.SubtotalMinorUnits,
		&truth.DiscountMinorUnits, &truth.TotalMinorUnits, &truth.Currency, &truth.PricingSnapshotHash,
		&truth.CouponCodeLast4, &truth.WltPaymentRefID, &truth.PaymentStatusProjection,
		&paymentUpdated, &truth.CorrelationID, &truth.Version, &truth.CreatedAt, &truth.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	truth.DeliveryAddressSnapshot = json.RawMessage(address)
	if paymentUpdated.Valid {
		truth.PaymentProjectionUpdatedAt = &paymentUpdated.Time
	}
	truth.CurrentOwner = currentOwner(truth.Status)
	truth.AllowedActions = AllowedActions(truth.Status, viewerRole)

	itemRows, err := tx.Query(`
		SELECT id::text, product_id, product_name, quantity, unit_price, line_total_minor_units, item_snapshot
		FROM dsh_order_items WHERE order_id=$1::uuid ORDER BY created_at,id`, orderID)
	if err != nil {
		return nil, err
	}
	for itemRows.Next() {
		var item OrderTruthItem
		var snapshot []byte
		if err = itemRows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.Quantity, &item.UnitPrice, &item.LineTotalMinorUnits, &snapshot); err != nil {
			itemRows.Close()
			return nil, err
		}
		item.Snapshot = json.RawMessage(snapshot)
		truth.Items = append(truth.Items, item)
	}
	if err = itemRows.Err(); err != nil {
		itemRows.Close()
		return nil, err
	}
	itemRows.Close()

	eventRows, err := tx.Query(`
		SELECT id::text, event_type, actor_role, from_status, to_status, correlation_id,
		       causation_id, order_version, metadata, created_at
		FROM dsh_order_status_events
		WHERE tenant_id=$1 AND order_id=$2::uuid ORDER BY created_at,id`, tenantID, orderID)
	if err != nil {
		return nil, err
	}
	for eventRows.Next() {
		var event OrderTruthEvent
		var metadata []byte
		if err = eventRows.Scan(&event.ID, &event.Type, &event.ActorRole, &event.FromStatus, &event.ToStatus, &event.CorrelationID, &event.CausationID, &event.OrderVersion, &metadata, &event.CreatedAt); err != nil {
			eventRows.Close()
			return nil, err
		}
		event.Metadata = json.RawMessage(metadata)
		truth.StatusTimeline = append(truth.StatusTimeline, event)
	}
	if err = eventRows.Err(); err != nil {
		eventRows.Close()
		return nil, err
	}
	eventRows.Close()
	return &truth, nil
}

func currentOwner(status OrderStatus) string {
	switch status {
	case StatusPending, StatusStoreAccepted, StatusPreparing, StatusReadyForPickup:
		return "partner"
	case StatusDriverAssigned, StatusArrivedStore, StatusPickedUp, StatusArrivedCustomer, StatusReturningStore, StatusReturnArrivedStore:
		return "captain"
	case StatusDelivered, StatusReturnedStore, StatusCancelled:
		return "terminal"
	default:
		if strings.HasPrefix(string(status), "cancelled_") || strings.HasPrefix(string(status), "failed_") {
			return "terminal"
		}
		return "operations"
	}
}

func AllowedActions(status OrderStatus, viewerRole string) []string {
	actions := []string{"view"}
	switch viewerRole {
	case "client":
		if status == StatusPending {
			actions = append(actions, "cancel_if_policy_allows")
		}
		if status == StatusDriverAssigned || status == StatusArrivedStore || status == StatusPickedUp || status == StatusArrivedCustomer {
			actions = append(actions, "track")
		}
		if status == StatusDelivered {
			actions = append(actions, "rate")
		}
	case "partner":
		switch status {
		case StatusPending:
			actions = append(actions, "accept", "reject")
		case StatusStoreAccepted:
			actions = append(actions, "start_preparing")
		case StatusPreparing:
			actions = append(actions, "revise_estimate", "mark_ready")
		case StatusReadyForPickup:
			actions = append(actions, "confirm_handoff")
		}
	case "operator":
		actions = append(actions, "view_audit")
		if status == StatusPending || status == StatusStoreAccepted || status == StatusPreparing {
			actions = append(actions, "cancel_if_policy_allows")
		}
	}
	return actions
}
