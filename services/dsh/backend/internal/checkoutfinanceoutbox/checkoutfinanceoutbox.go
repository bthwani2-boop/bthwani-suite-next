// Package checkoutfinanceoutbox implements a durable outbox for closing out a
// WLT payment session when the DSH-side checkout intent or order it belongs
// to is cancelled/rejected.
//
// Two producers write into this outbox in the SAME database transaction that
// commits their own state change:
//   - checkout.CancelIntent, when a checkout intent that already reached
//     payment_pending (i.e. has a WLT payment session but no order yet) is
//     cancelled. WLT should simply expire that not-yet-captured session.
//   - orders.RejectOrder / orders.CancelOrderByOperator, when an order that
//     already has a WLT payment session reference is rejected or cancelled.
//     WLT decides internally whether to expire the session, open a pending
//     refund for review, or no-op if the session already reached a terminal
//     state.
//
// This guarantees the WLT-side closure signal is never lost even if WLT is
// temporarily unreachable. A background worker drains pending rows and
// retries with exponential backoff until WLT acknowledges the closure.
package checkoutfinanceoutbox

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// Event types this outbox understands. See dsh-048_checkout_financial_closure_outbox.sql.
const (
	EventTypeExpireSession  = "expire_session"
	EventTypeCancelForOrder = "cancel_for_order"
)

// Event represents a pending or retried financial-closure notification bound
// for WLT.
type Event struct {
	ID               string
	EventType        string
	CheckoutIntentID string
	PaymentSessionID string
	OrderID          string
	ClientID         string
	Reason           string
	CorrelationID    string
	AttemptCount     int
}

// EnqueueInput is the set of fields required when writing a financial closure
// event inside a checkout-intent-cancellation or order-rejection/cancellation
// transaction.
type EnqueueInput struct {
	EventType        string
	CheckoutIntentID string
	PaymentSessionID string
	// OrderID is nil for expire_session events raised before any order
	// exists, and set for cancel_for_order events raised against an order.
	OrderID       *string
	ClientID      string
	Reason        string
	CorrelationID string
}

// Enqueue writes a financial closure event inside tx. It must be called
// within the same transaction that commits the checkout intent cancellation
// or order rejection/cancellation so the event is guaranteed to be durable
// even if WLT is unreachable. A duplicate (payment_session_id, event_type)
// pair is silently discarded (ON CONFLICT DO NOTHING) so re-entrant calls are
// safe.
func Enqueue(tx *sql.Tx, input EnqueueInput) error {
	if input.EventType == "" || input.CheckoutIntentID == "" || input.PaymentSessionID == "" || input.ClientID == "" {
		return fmt.Errorf("checkout finance outbox: eventType, checkoutIntentId, paymentSessionId, and clientId are required")
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

// ClaimBatch leases up to limit pending events due for delivery.
// It updates next_retry_at so concurrent workers skip leased rows.
func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT id, event_type, checkout_intent_id::text, payment_session_id,
		       COALESCE(order_id::text, ''), client_id, reason,
		       COALESCE(correlation_id, checkout_intent_id::text), attempt_count
		FROM dsh_checkout_financial_closure_outbox
		WHERE status = 'pending' AND next_retry_at <= NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("claim checkout finance outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.EventType, &e.CheckoutIntentID, &e.PaymentSessionID,
			&e.OrderID, &e.ClientID, &e.Reason, &e.CorrelationID, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan checkout finance outbox event: %w", err)
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()

	if len(events) > 0 {
		ids := make([]string, len(events))
		for i, e := range events {
			ids[i] = e.ID
		}
		if _, err := tx.Exec(`
			UPDATE dsh_checkout_financial_closure_outbox
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`,
			pqStringArray(ids), lease.String(),
		); err != nil {
			return nil, fmt.Errorf("lease checkout finance outbox batch: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

// MarkSent marks the event as successfully delivered.
func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE dsh_checkout_financial_closure_outbox
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`,
		id,
	)
	return err
}

// MarkFailed records a delivery failure and schedules the next retry with
// exponential backoff capped at 30 minutes. The row remains 'pending' so
// retries continue indefinitely — a dangling WLT payment session is a
// financial bug.
func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	next := attemptCount + 1
	backoff := time.Duration(1<<uint(min(next, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE dsh_checkout_financial_closure_outbox
		SET attempt_count = $2, last_error = $3, next_retry_at = NOW() + $4::interval, updated_at = NOW()
		WHERE id = $1::uuid`,
		id, next, cause.Error(), backoff.String(),
	)
	return err
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// pqStringArray formats a []string as a Postgres array literal for ANY($1::uuid[]).
func pqStringArray(values []string) string {
	out := "{"
	for i, v := range values {
		if i > 0 {
			out += ","
		}
		out += `"` + v + `"`
	}
	return out + "}"
}
