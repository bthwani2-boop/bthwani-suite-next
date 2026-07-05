// Package wltoutbox implements a durable outbox for events that DSH must
// eventually deliver to WLT. A captain's proof-of-delivery submission writes
// an outbox row in the same database transaction that confirms the delivery,
// so the notification survives a WLT outage instead of being lost as a
// fire-and-forget call. A background worker (see worker.go) drains pending
// rows and retries with backoff until WLT accepts the event.
package wltoutbox

import (
	"database/sql"
	"fmt"
	"time"
)

// EventTypeDeliveryCompleted signals that a COD order has been delivered and
// WLT should open its own COD collection record for it.
const EventTypeDeliveryCompleted = "delivery_completed"

// Event is a pending or retried notification bound for WLT.
type Event struct {
	ID               string
	EventType        string
	OrderID          string
	CaptainID        string
	PartnerID        string
	CheckoutIntentID string
	AttemptCount     int
}

// Enqueue records a delivery-completed event for order orderID. It must run
// inside the same transaction that confirms the delivery so the event can
// never be committed without the notification, or vice versa. Re-enqueuing
// the same (orderID, eventType) pair is a no-op.
func Enqueue(tx *sql.Tx, eventType, orderID, captainID, partnerID, checkoutIntentID string) error {
	_, err := tx.Exec(`
		INSERT INTO dsh_wlt_outbox_events (event_type, order_id, captain_id, partner_id, checkout_intent_id)
		VALUES ($1, $2::uuid, $3, $4, $5::uuid)
		ON CONFLICT (order_id, event_type) DO NOTHING`,
		eventType, orderID, captainID, partnerID, checkoutIntentID,
	)
	if err != nil {
		return fmt.Errorf("enqueue wlt outbox event: %w", err)
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
		SELECT id, event_type, order_id::text, captain_id, partner_id, checkout_intent_id::text, attempt_count
		FROM dsh_wlt_outbox_events
		WHERE status = 'pending' AND next_retry_at <= NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("claim wlt outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(&e.ID, &e.EventType, &e.OrderID, &e.CaptainID, &e.PartnerID, &e.CheckoutIntentID, &e.AttemptCount); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan wlt outbox event: %w", err)
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
			UPDATE dsh_wlt_outbox_events
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`,
			pqStringArray(ids), lease.String(),
		); err != nil {
			return nil, fmt.Errorf("lease wlt outbox batch: %w", err)
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
		UPDATE dsh_wlt_outbox_events
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`,
		id,
	)
	return err
}

// MarkFailed records a delivery failure and schedules the next retry with
// exponential backoff (capped at 30 minutes). The event stays 'pending' so
// it is retried indefinitely — a lost WLT notification is a financial-
// correctness bug, not something to give up on after N attempts.
func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE dsh_wlt_outbox_events
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
