// Package dshoutbox implements a durable outbox for payment-session and
// completed-refund events that WLT must eventually deliver to DSH.
package dshoutbox

import (
	"database/sql"
	"fmt"
	"time"
)

const (
	EventTypeFailed   = "failed"
	EventTypeCaptured = "captured"
	EventTypeExpired  = "expired"
	EventTypeRefunded = "refunded"
)

type Event struct {
	ID               string
	EventType        string
	PaymentSessionID string
	TenantID         string
	CheckoutIntentID *string
	SpecialRequestID *string
	OrderID          string
	RefundReference  string
	Reason           string
	CorrelationID    string
	AttemptCount     int
}

// Enqueue records a payment-session outcome. Re-enqueuing the same
// (sessionID,eventType) pair is a no-op.
func Enqueue(tx *sql.Tx, eventType, sessionID string, tenantID string, checkoutIntentID, specialRequestID *string) error {
	hasTenantColumn, err := hasOutboxTenantColumn(tx)
	if err != nil {
		return fmt.Errorf("inspect dsh outbox tenancy column: %w", err)
	}
	var execErr error
	if hasTenantColumn {
		_, execErr = tx.Exec(`
			INSERT INTO wlt_dsh_outbox_events (event_type, payment_session_id, tenant_id, checkout_intent_id, special_request_id)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (payment_session_id, event_type) WHERE refund_reference IS NULL DO NOTHING`,
			eventType, sessionID, tenantID, checkoutIntentID, specialRequestID,
		)
	} else {
		_, execErr = tx.Exec(`
			INSERT INTO wlt_dsh_outbox_events (event_type, payment_session_id, checkout_intent_id, special_request_id)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (payment_session_id, event_type) DO NOTHING`,
			eventType, sessionID, checkoutIntentID, specialRequestID,
		)
	}
	if execErr != nil {
		return fmt.Errorf("enqueue dsh outbox event: %w", execErr)
	}
	return nil
}

// EnqueueRefund records the privacy-safe completed-refund projection in the
// same transaction as ledger posting and refund completion. The refund
// reference is the idempotency identity, allowing multiple partial refunds for
// one payment session without collapsing them into one event.
func EnqueueRefund(tx *sql.Tx, refundID, sessionID, tenantID, orderID, reason, correlationID string, checkoutIntentID, specialRequestID *string) error {
	if refundID == "" || sessionID == "" || tenantID == "" || orderID == "" {
		return fmt.Errorf("refundId, paymentSessionId, tenantId and orderId are required for refund outbox")
	}
	_, err := tx.Exec(`
		INSERT INTO wlt_dsh_outbox_events
			(event_type,payment_session_id,tenant_id,checkout_intent_id,special_request_id,
			 order_id,refund_reference,reason,correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (refund_reference,event_type) WHERE refund_reference IS NOT NULL DO NOTHING`,
		EventTypeRefunded, sessionID, tenantID, checkoutIntentID, specialRequestID,
		orderID, refundID, reason, correlationID,
	)
	if err != nil {
		return fmt.Errorf("enqueue refund dsh outbox event: %w", err)
	}
	return nil
}

func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT id, event_type, payment_session_id,
		       COALESCE(to_jsonb(wlt_dsh_outbox_events)->>'tenant_id', 'tenant-dev-001'),
		       checkout_intent_id, special_request_id,
		       COALESCE(to_jsonb(wlt_dsh_outbox_events)->>'order_id',''),
		       COALESCE(to_jsonb(wlt_dsh_outbox_events)->>'refund_reference',''),
		       COALESCE(to_jsonb(wlt_dsh_outbox_events)->>'reason',''),
		       COALESCE(to_jsonb(wlt_dsh_outbox_events)->>'correlation_id',''),
		       attempt_count
		FROM wlt_dsh_outbox_events
		WHERE status = 'pending' AND next_retry_at <= NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim dsh outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.EventType, &e.PaymentSessionID, &e.TenantID,
			&e.CheckoutIntentID, &e.SpecialRequestID, &e.OrderID, &e.RefundReference,
			&e.Reason, &e.CorrelationID, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan dsh outbox event: %w", err)
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
			UPDATE wlt_dsh_outbox_events
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`, pqStringArray(ids), lease.String()); err != nil {
			return nil, fmt.Errorf("lease dsh outbox batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE wlt_dsh_outbox_events
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`, id)
	return err
}

func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE wlt_dsh_outbox_events
		SET attempt_count = $2, last_error = $3, next_retry_at = NOW() + $4::interval, updated_at = NOW()
		WHERE id = $1::uuid`, id, nextAttempt, cause.Error(), backoff.String())
	return err
}

func min(a, b int) int {
	if a < b { return a }
	return b
}

func hasOutboxTenantColumn(tx *sql.Tx) (bool, error) {
	var exists bool
	err := tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'wlt_dsh_outbox_events' AND column_name = 'tenant_id'
		)`).Scan(&exists)
	return exists, err
}

func pqStringArray(values []string) string {
	out := "{"
	for i, v := range values {
		if i > 0 { out += "," }
		out += `"` + v + `"`
	}
	return out + "}"
}
