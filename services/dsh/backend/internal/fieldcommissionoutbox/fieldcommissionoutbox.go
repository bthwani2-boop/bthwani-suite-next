// Package fieldcommissionoutbox implements a durable outbox for field visit
// commission eligibility events that DSH must eventually deliver to WLT.
//
// When a field agent completes an onboarding visit, this package writes an
// outbox row in the SAME database transaction that commits the visit
// completion. This guarantees that a commission eligibility signal is never
// lost even if WLT is temporarily unreachable. A background worker drains
// pending rows and retries with exponential backoff until WLT acknowledges
// the event and creates an idempotent commission record.
package fieldcommissionoutbox

import (
	"database/sql"
	"fmt"
	"time"
)

// EventTypeFieldVisitCommission is the canonical event type for field agent
// commission eligibility following a completed onboarding visit.
const EventTypeFieldVisitCommission = "field_visit_commission"

// Event represents a pending or retried commission eligibility notification
// bound for WLT.
type Event struct {
	ID                 string
	EventID            string
	EventType          string
	FieldActorID       string
	VisitID            string
	StoreID            string
	PartnerID          string
	CommissionPolicyID string
	CorrelationID      string
	IdempotencyKey     string
	OccurredAt         time.Time
	AttemptCount       int
}

// EnqueueInput is the set of fields required when writing a commission
// eligibility event inside a visit-completion transaction.
type EnqueueInput struct {
	FieldActorID       string
	VisitID            string
	StoreID            string
	PartnerID          string
	CommissionPolicyID string
	// IdempotencyKey must be stable per visit — callers should derive it from
	// "field_visit_commission:{visitId}" so duplicate visits are no-ops.
	IdempotencyKey string
}

// Enqueue writes a commission eligibility event inside tx. It must be called
// within the same transaction that commits the field visit as complete so the
// event is guaranteed to be durable even if WLT is unreachable. A duplicate
// idempotency_key is silently discarded (ON CONFLICT DO NOTHING).
func Enqueue(tx *sql.Tx, input EnqueueInput) error {
	if input.IdempotencyKey == "" {
		input.IdempotencyKey = fmt.Sprintf("field_visit_commission:%s", input.VisitID)
	}
	_, err := tx.Exec(`
		INSERT INTO dsh_field_commission_outbox
			(field_actor_id, visit_id, store_id, partner_id, commission_policy_id, idempotency_key)
		VALUES ($1, $2::uuid, $3, $4, $5, $6)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		input.FieldActorID, input.VisitID, input.StoreID,
		nullableString(input.PartnerID), nullableString(input.CommissionPolicyID),
		input.IdempotencyKey,
	)
	if err != nil {
		return fmt.Errorf("enqueue field commission outbox event: %w", err)
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
		SELECT id, event_id, event_type, field_actor_id, visit_id::text, store_id,
		       COALESCE(partner_id,''), COALESCE(commission_policy_id,''),
		       correlation_id::text, idempotency_key, occurred_at, attempt_count
		FROM dsh_field_commission_outbox
		WHERE status = 'pending' AND next_retry_at <= NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("claim field commission outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.EventID, &e.EventType, &e.FieldActorID, &e.VisitID, &e.StoreID,
			&e.PartnerID, &e.CommissionPolicyID,
			&e.CorrelationID, &e.IdempotencyKey, &e.OccurredAt, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan field commission outbox event: %w", err)
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
			UPDATE dsh_field_commission_outbox
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`,
			pqStringArray(ids), lease.String(),
		); err != nil {
			return nil, fmt.Errorf("lease field commission outbox batch: %w", err)
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
		UPDATE dsh_field_commission_outbox
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`,
		id,
	)
	return err
}

// MarkFailed records a delivery failure and schedules the next retry with
// exponential backoff capped at 30 minutes. The row remains 'pending' so
// retries continue indefinitely — a lost commission event is a financial bug.
func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	next := attemptCount + 1
	backoff := time.Duration(1<<uint(min(next, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE dsh_field_commission_outbox
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

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
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
