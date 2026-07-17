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

// MarkSent marks the event as successfully delivered.
func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE dsh_operational_outbox_events
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`,
		id,
	)
	return err
}

// MarkFailed records a delivery failure and schedules the next retry with
// exponential backoff capped at 30 minutes.
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
	_, err := db.Exec(`
		UPDATE dsh_operational_outbox_events
		SET attempt_count = $2, last_error = $3, next_retry_at = NOW() + $4::interval, updated_at = NOW()
		WHERE id = $1::uuid`,
		id, next, errMsg, backoff.String(),
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
