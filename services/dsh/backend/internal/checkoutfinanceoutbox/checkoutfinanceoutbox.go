// Package checkoutfinanceoutbox owns the DSH-side durable orchestration record
// for checkout and order financial closure. WLT remains authoritative for the
// payment-session, refund, and COD outcomes.
package checkoutfinanceoutbox

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	EventTypeExpireSession         = "expire_session"
	EventTypeCancelForOrder        = "cancel_for_order"
	EventTypeReleaseCodReservation = "release_cod_reservation"

	MaxDeliveryAttempts = 15
	MaxReadbackAttempts = 5
)

type Event struct {
	ID                   string
	EventType            string
	Status               string
	OperatorContextID    string
	CheckoutIntentID     string
	PaymentSessionID     string
	OrderID              string
	ClientID             string
	Reason               string
	CorrelationID        string
	AttemptCount         int
	ReadbackAttemptCount int
	FailureDisposition   string
	DiagnosticCode       string
	LeaseToken           string
}

type EnqueueInput struct {
	EventType        string
	CheckoutIntentID string
	PaymentSessionID string
	OrderID          *string
	ClientID         string
	Reason           string
	CorrelationID    string
}

func supportedEventType(eventType string) bool {
	switch strings.TrimSpace(eventType) {
	case EventTypeExpireSession, EventTypeCancelForOrder, EventTypeReleaseCodReservation:
		return true
	default:
		return false
	}
}

func validOperatorContextID(operatorContextID string) bool {
	return strings.TrimSpace(operatorContextID) != ""
}

// Enqueue writes a financial closure event inside tx. OperatorContext ownership
// is never accepted from the caller; ClaimBatch derives it from the immutable
// checkout-intent owner immediately before delivery.
func Enqueue(tx *sql.Tx, input EnqueueInput) error {
	input.EventType = strings.TrimSpace(input.EventType)
	if !supportedEventType(input.EventType) {
		return fmt.Errorf("checkout finance outbox: unsupported event type %q", input.EventType)
	}
	if input.CheckoutIntentID == "" || input.PaymentSessionID == "" || input.ClientID == "" {
		return fmt.Errorf("checkout finance outbox: checkoutIntentId, paymentSessionId, and clientId are required")
	}
	correlationID := strings.TrimSpace(input.CorrelationID)
	if correlationID == "" {
		correlationID = strings.TrimSpace(input.CheckoutIntentID)
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_checkout_financial_closure_outbox
			(event_type, checkout_intent_id, payment_session_id, order_id, client_id, reason, correlation_id)
		VALUES ($1, $2::uuid, $3, $4::uuid, $5, $6, $7)
		ON CONFLICT (payment_session_id, event_type) DO NOTHING`,
		input.EventType, input.CheckoutIntentID, input.PaymentSessionID,
		input.OrderID, input.ClientID, input.Reason, correlationID,
	)
	if err != nil {
		return fmt.Errorf("enqueue checkout finance outbox event: %w", err)
	}
	return nil
}

// EnqueueCodReservationReleaseForOrder records a WLT reservation release
// after an order assignment leaves the active dispatch state. It resolves the
// checkout/session identity from DSH's order bridge, but never derives money
// locally.
func EnqueueCodReservationReleaseForOrderTx(tx *sql.Tx, orderID, reason, correlationID string) error {
	if strings.TrimSpace(orderID) == "" {
		return nil
	}
	var checkoutIntentID, paymentSessionID, clientID string
	err := tx.QueryRow(`
		SELECT intent.id::text, btrim(intent.wlt_payment_session_id), order_row.client_id
		FROM dsh_orders order_row
		JOIN dsh_checkout_intents intent ON intent.id = order_row.checkout_intent_id
		WHERE order_row.id = $1::uuid`, orderID).Scan(&checkoutIntentID, &paymentSessionID, &clientID)
	if err != nil {
		return fmt.Errorf("resolve order %q for COD reservation release: %w", orderID, err)
	}
	if paymentSessionID == "" {
		return nil
	}
	orderIDCopy := strings.TrimSpace(orderID)
	return Enqueue(tx, EnqueueInput{
		EventType:        EventTypeReleaseCodReservation,
		CheckoutIntentID: checkoutIntentID,
		PaymentSessionID: paymentSessionID,
		OrderID:          &orderIDCopy,
		ClientID:         clientID,
		Reason:           strings.TrimSpace(reason),
		CorrelationID:    correlationID,
	})
}

func EnqueueCodReservationReleaseForOrder(db *sql.DB, orderID, reason, correlationID string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := EnqueueCodReservationReleaseForOrderTx(tx, orderID, reason, correlationID); err != nil {
		return err
	}
	return tx.Commit()
}

func EnqueuePaymentSessionExpiry(db *sql.DB, checkoutIntentID, paymentSessionID, clientID, reason, correlationID string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := Enqueue(tx, EnqueueInput{
		EventType:        EventTypeExpireSession,
		CheckoutIntentID: strings.TrimSpace(checkoutIntentID),
		PaymentSessionID: strings.TrimSpace(paymentSessionID),
		ClientID:         strings.TrimSpace(clientID),
		Reason:           strings.TrimSpace(reason),
		CorrelationID:    strings.TrimSpace(correlationID),
	}); err != nil {
		return err
	}
	return tx.Commit()
}

func leaseInterval(lease time.Duration) (string, error) {
	if lease <= 0 {
		return "", fmt.Errorf("checkout finance outbox lease must be positive")
	}
	return fmt.Sprintf("%.6f seconds", lease.Seconds()), nil
}

// ClaimBatch atomically moves due work into processing and assigns a fencing
// token. Pending work, durable unknown outcomes, and expired processing leases
// are all recoverable; failed and sent rows are never claimed automatically.
func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	if limit <= 0 {
		return []Event{}, nil
	}
	leaseValue, err := leaseInterval(lease)
	if err != nil {
		return nil, err
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	rows, err := tx.Query(`
		SELECT outbox.id, outbox.event_type, outbox.status,
		       btrim(COALESCE(intent.operator_context_id, '')),
		       outbox.checkout_intent_id::text, outbox.payment_session_id,
		       COALESCE(outbox.order_id::text, ''), outbox.client_id, outbox.reason,
		       COALESCE(outbox.correlation_id, outbox.checkout_intent_id::text),
		       outbox.attempt_count, outbox.readback_attempt_count,
		       outbox.failure_disposition, COALESCE(outbox.diagnostic_code, '')
		FROM dsh_checkout_financial_closure_outbox outbox
		JOIN dsh_checkout_intents intent ON intent.id = outbox.checkout_intent_id
		WHERE (
			(outbox.status IN ('pending', 'unknown') AND outbox.next_retry_at <= NOW())
			OR (outbox.status = 'processing' AND (outbox.lease_expires_at IS NULL OR outbox.lease_expires_at <= NOW()))
		)
		ORDER BY outbox.created_at, outbox.id
		LIMIT $1
		FOR UPDATE OF outbox SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim checkout finance outbox batch: %w", err)
	}

	events := make([]Event, 0, limit)
	for rows.Next() {
		var event Event
		if err := rows.Scan(
			&event.ID, &event.EventType, &event.Status, &event.OperatorContextID,
			&event.CheckoutIntentID, &event.PaymentSessionID, &event.OrderID,
			&event.ClientID, &event.Reason, &event.CorrelationID, &event.AttemptCount,
			&event.ReadbackAttemptCount, &event.FailureDisposition, &event.DiagnosticCode,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan checkout finance outbox event: %w", err)
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	for index := range events {
		events[index].LeaseToken = uuid.NewString()
		if _, err := tx.Exec(`
			UPDATE dsh_checkout_financial_closure_outbox
			SET status='processing', lease_token=$2::uuid,
			    lease_expires_at=NOW()+$3::interval, updated_at=NOW()
			WHERE id=$1::uuid AND status=$4`,
			events[index].ID, events[index].LeaseToken, leaseValue, events[index].Status); err != nil {
			return nil, fmt.Errorf("fence checkout finance outbox event %s: %w", events[index].ID, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}
