// Package operationaloutbox implements a durable outbox for operational
// (non-financial) events raised by special requests, partner delivery, and
// pickup flows. Downstream in-app notifications can therefore be delivered
// reliably even when the API process restarts after the source transaction
// commits.
//
// Producers write into this outbox in the SAME database transaction that
// commits their own state change, via Enqueue(tx, ...). RunWorker in worker.go
// drains pending rows into the canonical notification store. ClaimBatch leases
// rows with SKIP LOCKED; failures are retried with exponential backoff through
// MarkFailed until MarkSent records successful consumption.
package operationaloutbox

import (
	"database/sql"
	"fmt"
	"time"
)

const MaxDeliveryAttempts = 10

// Event represents a pending or retried operational-closure event.
type Event struct {
	ID            string
	EventType     string
	EntityType    string
	EntityID      string
	Payload       []byte
	CorrelationID string
	AttemptCount  int
}

// EnqueueInput is the set of fields required when writing an operational
// closure event inside a source state-change transaction.
type EnqueueInput struct {
	EventType     string
	EntityType    string
	EntityID      string
	Payload       []byte
	CorrelationID string
}

// Enqueue writes an operational closure event inside tx. It must be called
// within the same transaction that commits the state change so the event is
// guaranteed to be durable even if a downstream consumer is unreachable.
func Enqueue(tx *sql.Tx, input EnqueueInput) error {
	if input.EventType == "" || input.EntityType == "" || input.EntityID == "" {
		return fmt.Errorf("operational outbox: eventType, entityType, and entityId are required")
	}
	payload := input.Payload
	if len(payload) == 0 {
		payload = []byte("{}")
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_operational_outbox_events
			(event_type, entity_type, entity_id, payload, correlation_id)
		VALUES ($1, $2, $3, $4::jsonb, $5)`,
		input.EventType, input.EntityType, input.EntityID, string(payload), input.CorrelationID,
	)
	if err != nil {
		return fmt.Errorf("enqueue operational outbox event: %w", err)
	}
	return nil
}

// ClaimBatch leases up to limit pending events due for delivery. It updates
// next_retry_at so concurrent workers skip leased rows.
func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT id::text, event_type, entity_type, entity_id, payload::text,
		       COALESCE(correlation_id, ''), attempt_count
		FROM dsh_operational_outbox_events
		WHERE status = 'pending' AND next_retry_at <= NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("claim operational outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		var payload string
		if err := rows.Scan(
			&e.ID, &e.EventType, &e.EntityType, &e.EntityID, &payload,
			&e.CorrelationID, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan operational outbox event: %w", err)
		}
		e.Payload = []byte(payload)
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
			UPDATE dsh_operational_outbox_events
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`,
			pqStringArray(ids), lease.String(),
		); err != nil {
			return nil, fmt.Errorf("lease operational outbox batch: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

// MarkSent records the final successful delivery attempt atomically with the
// outbox terminal state.
func MarkSent(db *sql.DB, id string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var previousAttempts int
	if err := tx.QueryRow(`
		UPDATE dsh_operational_outbox_events
		SET status = 'sent', sent_at = NOW(), failed_at = NULL,
		    last_error = NULL, updated_at = NOW()
		WHERE id = $1::uuid
		RETURNING attempt_count`, id).Scan(&previousAttempts); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_notification_delivery_attempts
			(event_id, attempt_number, outcome, error_message)
		VALUES ($1::uuid, $2, 'sent', '')
		ON CONFLICT (event_id, attempt_number) DO NOTHING`, id, previousAttempts+1); err != nil {
		return err
	}
	return tx.Commit()
}

// MarkFailed records a delivery failure and schedules the next retry with
// exponential backoff capped at 30 minutes. After MaxDeliveryAttempts the row
// enters the terminal failed/dead-letter state and is no longer claimed.
func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	next := attemptCount + 1
	backoff := time.Duration(1<<uint(min(next, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	errMsg := ""
	if cause != nil {
		errMsg = cause.Error()
	}
	status := "pending"
	outcome := "retry_scheduled"
	var nextRetryAt *time.Time
	if next >= MaxDeliveryAttempts {
		status = "failed"
		outcome = "dead_letter"
	} else {
		value := time.Now().UTC().Add(backoff)
		nextRetryAt = &value
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`
		UPDATE dsh_operational_outbox_events
		SET attempt_count = $2,
		    last_error = $3,
		    status = $4,
		    next_retry_at = CASE WHEN $4 = 'pending' THEN $5 ELSE next_retry_at END,
		    failed_at = CASE WHEN $4 = 'failed' THEN NOW() ELSE NULL END,
		    updated_at = NOW()
		WHERE id = $1::uuid`, id, next, errMsg, status, nextRetryAt); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_notification_delivery_attempts
			(event_id, attempt_number, outcome, error_message, next_retry_at)
		VALUES ($1::uuid, $2, $3, $4, $5)
		ON CONFLICT (event_id, attempt_number) DO UPDATE
		SET outcome = EXCLUDED.outcome,
		    error_message = EXCLUDED.error_message,
		    next_retry_at = EXCLUDED.next_retry_at`, id, next, outcome, errMsg, nextRetryAt); err != nil {
		return err
	}
	return tx.Commit()
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
