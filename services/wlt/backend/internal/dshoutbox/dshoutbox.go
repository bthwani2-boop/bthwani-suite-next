// Package dshoutbox implements a durable outbox for payment-session outcome
// events that WLT must eventually deliver to DSH. A session's terminal
// status transition (failed, captured, expired) writes an outbox row in the
// same database transaction that commits the transition, so the
// notification survives a DSH outage instead of being lost as a
// fire-and-forget call. A background worker (see worker.go) drains pending
// rows and retries with backoff until DSH accepts the event.
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
)

// Event is a pending or retried notification bound for DSH.
type Event struct {
	ID               string
	EventType        string
	PaymentSessionID string
	CheckoutIntentID string
	AttemptCount     int
}

// Enqueue records a payment-session outcome event for sessionID. It must run
// inside the same transaction that commits the session's status transition
// so the event can never be committed without the notification, or vice
// versa. Re-enqueuing the same (sessionID, eventType) pair is a no-op.
func Enqueue(tx *sql.Tx, eventType, sessionID, checkoutIntentID string) error {
	_, err := tx.Exec(`
		INSERT INTO wlt_dsh_outbox_events (event_type, payment_session_id, checkout_intent_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (payment_session_id, event_type) DO NOTHING`,
		eventType, sessionID, checkoutIntentID,
	)
	if err != nil {
		return fmt.Errorf("enqueue dsh outbox event: %w", err)
	}
	return nil
}

// ClaimBatch leases up to limit pending events that are due for delivery,
// pushing their next_retry_at forward so concurrent workers (or worker
// restarts) don't double-send while a lease is outstanding. Callers must
// call MarkSent or MarkFailed for every claimed event.
func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT id, event_type, payment_session_id, checkout_intent_id, attempt_count
		FROM wlt_dsh_outbox_events
		WHERE status = 'pending' AND next_retry_at <= NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("claim dsh outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.EventType, &e.PaymentSessionID, &e.CheckoutIntentID, &e.AttemptCount); err != nil {
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
			WHERE id = ANY($1::uuid[])`,
			pqStringArray(ids), lease.String(),
		); err != nil {
			return nil, fmt.Errorf("lease dsh outbox batch: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

// MarkSent finalizes a successfully delivered event.
func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE wlt_dsh_outbox_events
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`,
		id,
	)
	return err
}

// MarkFailed records a delivery failure and schedules the next retry with
// exponential backoff (capped at 30 minutes). The event stays 'pending' so
// it is retried indefinitely — a lost DSH notification is a financial-
// correctness bug, not something to give up on after N attempts.
func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE wlt_dsh_outbox_events
		SET attempt_count = $2, last_error = $3, next_retry_at = NOW() + $4::interval, updated_at = NOW()
		WHERE id = $1::uuid`,
		id, nextAttempt, cause.Error(), backoff.String(),
	)
	return err
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// pqStringArray formats a []string as a Postgres array literal, e.g.
// {"a","b"}. lib/pq does not marshal []string automatically for ANY($1).
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
