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

const (
	EventTypeExpireSession  = "expire_session"
	EventTypeCancelForOrder = "cancel_for_order"
)

type Event struct {
	ID               string
	EventType        string
	OperatorContextID         string
	CheckoutIntentID string
	PaymentSessionID string
	OrderID          string
	ClientID         string
	Reason           string
	CorrelationID    string
	AttemptCount     int
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

// Enqueue writes a financial closure event inside tx. OperatorContext ownership is not
// accepted from the caller: ClaimBatch derives it later from the immutable
// checkout-intent owner before any WLT delivery or retry.
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

func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	rows, err := tx.Query(`
		SELECT outbox.id, outbox.event_type, btrim(intent.operator_context_id),
		       outbox.checkout_intent_id::text, outbox.payment_session_id,
		       COALESCE(outbox.order_id::text, ''), outbox.client_id, outbox.reason,
		       COALESCE(outbox.correlation_id, outbox.checkout_intent_id::text), outbox.attempt_count
		FROM dsh_checkout_financial_closure_outbox outbox
		JOIN dsh_checkout_intents intent ON intent.id=outbox.checkout_intent_id
		WHERE outbox.status = 'pending' AND outbox.next_retry_at <= NOW()
		  AND btrim(intent.operator_context_id) <> ''
		ORDER BY outbox.created_at
		LIMIT $1
		FOR UPDATE OF outbox SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("claim checkout finance outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.EventType, &e.OperatorContextID, &e.CheckoutIntentID, &e.PaymentSessionID,
			&e.OrderID, &e.ClientID, &e.Reason, &e.CorrelationID, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan checkout finance outbox event: %w", err)
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
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

func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE dsh_checkout_financial_closure_outbox
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`,
		id,
	)
	return err
}

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
