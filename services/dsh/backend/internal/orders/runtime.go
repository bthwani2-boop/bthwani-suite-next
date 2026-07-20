package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/checkoutfinanceoutbox"
)

const (
	StatusCancelledByClient   OrderStatus = "cancelled_by_client"
	StatusCancelledByStore    OrderStatus = "cancelled_by_store"
	StatusCancelledByOperator OrderStatus = "cancelled_by_operator"
	StatusCancelledNoDriver   OrderStatus = "cancelled_no_driver"
	StatusFailedPayment       OrderStatus = "failed_payment"
	StatusFailedDispatch      OrderStatus = "failed_dispatch"
)

var ErrCancellationRequiresReview = errors.New("order cancellation requires operator review")

func hydrateOrders(db *sql.DB, list []Order) ([]Order, error) {
	for i := range list {
		items, err := listOrderItems(db, list[i].ID)
		if err != nil {
			return nil, err
		}
		list[i].Items = items
	}
	return list, nil
}

func ListClientOrdersHydrated(db *sql.DB, tenantID, clientID string, limit int) ([]Order, error) {
	list, err := ListClientOrders(db, tenantID, clientID, limit)
	if err != nil {
		return nil, err
	}
	return hydrateOrders(db, list)
}

type CancellationInput struct {
	OrderID       string
	TenantID      string
	ActorID       string
	ActorRole     string
	ReasonCode    string
	ReasonNote    string
	CorrelationID string
}

func cancellationTarget(role, reasonCode string) OrderStatus {
	if role == "client" {
		return StatusCancelledByClient
	}
	if role == "partner" {
		return StatusCancelledByStore
	}
	if role == "system" && reasonCode == "no_driver" {
		return StatusCancelledNoDriver
	}
	return StatusCancelledByOperator
}

func validCancellationReason(role, code string) bool {
	allowed := map[string]map[string]bool{
		"client": {
			"changed_mind": true, "duplicate_order": true, "address_error": true,
			"payment_issue": true, "excessive_delay": true, "other": true,
		},
		"partner": {
			"out_of_stock": true, "store_closed": true, "capacity": true,
			"pricing_issue": true, "cannot_fulfill": true, "other": true,
		},
		"operator": {
			"customer_request": true, "partner_request": true, "no_driver": true,
			"fraud_risk": true, "safety": true, "operational_failure": true, "other": true,
		},
		"system": {
			"no_driver": true, "payment_failed": true, "dispatch_failed": true,
		},
	}
	return allowed[role][code]
}

func cancellableStatuses(role string) []OrderStatus {
	switch role {
	case "client":
		return []OrderStatus{StatusPending, StatusStoreAccepted}
	case "partner":
		return []OrderStatus{StatusPending, StatusStoreAccepted, StatusPreparing}
	case "operator":
		return []OrderStatus{
			StatusPending,
			StatusStoreAccepted,
			StatusPreparing,
			StatusReadyForPickup,
			StatusDriverAssigned,
			StatusArrivedStore,
			StatusReturnedStore,
		}
	case "system":
		return []OrderStatus{
			StatusPending,
			StatusStoreAccepted,
			StatusPreparing,
			StatusReadyForPickup,
			StatusDriverAssigned,
			StatusArrivedStore,
		}
	default:
		return nil
	}
}

func CancelOrder(db *sql.DB, input CancellationInput) (*Order, error) {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorRole = strings.TrimSpace(input.ActorRole)
	input.ReasonCode = strings.TrimSpace(input.ReasonCode)
	input.ReasonNote = strings.TrimSpace(input.ReasonNote)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if db == nil {
		return nil, fmt.Errorf("database is required")
	}
	if input.OrderID == "" || input.ActorID == "" || input.ActorRole == "" || input.ReasonCode == "" || input.CorrelationID == "" {
		return nil, ErrInvalid
	}
	if !validCancellationReason(input.ActorRole, input.ReasonCode) {
		return nil, fmt.Errorf("%w: unsupported cancellation reason", ErrInvalid)
	}
	if input.ReasonCode == "other" && input.ReasonNote == "" {
		return nil, fmt.Errorf("%w: reason note is required for other", ErrInvalid)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var (
		checkoutIntentID string
		clientID         string
		tenantID         string
		paymentSessionID string
		current          OrderStatus
	)
	err = tx.QueryRow(`
		SELECT checkout_intent_id::text, client_id, tenant_id, wlt_payment_ref_id, status
		FROM dsh_orders
		WHERE id=$1::uuid
		FOR UPDATE`, input.OrderID).Scan(
		&checkoutIntentID,
		&clientID,
		&tenantID,
		&paymentSessionID,
		&current,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if input.TenantID != "" && input.TenantID != tenantID {
		return nil, ErrNotFound
	}

	var existingCorrelation string
	err = tx.QueryRow(`
		SELECT correlation_id
		FROM dsh_order_cancellations
		WHERE order_id=$1::uuid`, input.OrderID).Scan(&existingCorrelation)
	if err == nil {
		if existingCorrelation == input.CorrelationID {
			if err := tx.Commit(); err != nil {
				return nil, err
			}
			return GetOrder(db, input.OrderID)
		}
		return nil, ErrConflict
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	allowed := false
	for _, status := range cancellableStatuses(input.ActorRole) {
		if current == status {
			allowed = true
			break
		}
	}
	if !allowed {
		if input.ActorRole == "client" && (current == StatusPreparing ||
			current == StatusReadyForPickup ||
			current == StatusDriverAssigned ||
			current == StatusArrivedStore) {
			return nil, ErrCancellationRequiresReview
		}
		return nil, ErrConflict
	}

	target := cancellationTarget(input.ActorRole, input.ReasonCode)
	financialStatus := "not_required"
	if paymentSessionID != "" {
		financialStatus = "pending"
	}
	if _, err := tx.Exec(`
		UPDATE dsh_orders
		SET status=$2,
		    rejection_reason=NULLIF($3,''),
		    cancellation_reason_code=$4,
		    cancellation_note=NULLIF($3,''),
		    cancelled_by_actor_id=$5,
		    cancelled_by_role=$6,
		    cancelled_at=NOW(),
		    financial_closure_status=$7,
		    financial_closure_reference=NULL,
		    updated_at=NOW()
		WHERE id=$1::uuid AND status=$8`,
		input.OrderID,
		string(target),
		input.ReasonNote,
		input.ReasonCode,
		input.ActorID,
		input.ActorRole,
		financialStatus,
		string(current),
	); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(`
		INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note)
		VALUES($1::uuid,$2,$3,$4,$5)`,
		input.OrderID,
		input.ActorRole,
		string(current),
		string(target),
		input.ReasonCode+": "+input.ReasonNote,
	); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_cancellations(
			order_id,tenant_id,actor_id,actor_role,reason_code,reason_note,
			from_status,to_status,financial_closure_status,correlation_id)
		VALUES($1::uuid,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9,$10)`,
		input.OrderID,
		tenantID,
		input.ActorID,
		input.ActorRole,
		input.ReasonCode,
		input.ReasonNote,
		string(current),
		string(target),
		financialStatus,
		input.CorrelationID,
	); err != nil {
		return nil, err
	}

	if paymentSessionID != "" {
		orderID := input.OrderID
		if err := checkoutfinanceoutbox.Enqueue(tx, checkoutfinanceoutbox.EnqueueInput{
			EventType:        checkoutfinanceoutbox.EventTypeCancelForOrder,
			CheckoutIntentID: checkoutIntentID,
			PaymentSessionID: paymentSessionID,
			OrderID:          &orderID,
			ClientID:         clientID,
			Reason:           input.ReasonCode + ": " + input.ReasonNote,
		}); err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`
			UPDATE dsh_checkout_financial_closure_outbox
			SET correlation_id=$2
			WHERE payment_session_id=$1 AND event_type='cancel_for_order'`,
			paymentSessionID,
			input.CorrelationID,
		); err != nil {
			return nil, err
		}
	}

	if _, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events(
			event_type,entity_type,entity_id,payload,correlation_id)
		VALUES($1,'order',$2,$3::jsonb,$4)`,
		"order."+string(target),
		input.OrderID,
		fmt.Sprintf(
			`{"orderId":%q,"clientId":%q,"reasonCode":%q}`,
			input.OrderID,
			clientID,
			input.ReasonCode,
		),
		input.CorrelationID,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOrder(db, input.OrderID)
}
