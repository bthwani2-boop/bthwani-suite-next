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
	"strings"
	"time"
)

const EventTypeFieldVisitCommission = "field_visit_commission"

type Event struct {
	ID                 string
	EventID            string
	EventType          string
	OperatorContextID           string
	FieldActorID       string
	VisitID            string
	StoreID            string
	PartnerID          string
	PartnerCategory    string
	CommissionPolicyID string
	CorrelationID      string
	IdempotencyKey     string
	OccurredAt         time.Time
	AttemptCount       int
}

type EnqueueInput struct {
	FieldActorID       string
	VisitID            string
	StoreID            string
	CommissionPolicyID string
	IdempotencyKey     string
}

// Enqueue resolves partner identity and category from DSH-owned store truth in
// the same transaction as visit completion. Neither the app nor WLT may supply
// or override this category evidence.
func Enqueue(tx *sql.Tx, input EnqueueInput) error {
	input.FieldActorID = strings.TrimSpace(input.FieldActorID)
	input.VisitID = strings.TrimSpace(input.VisitID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	if input.FieldActorID == "" || input.VisitID == "" || input.StoreID == "" {
		return fmt.Errorf("field actor, visit and store are required")
	}
	if input.IdempotencyKey == "" {
		input.IdempotencyKey = fmt.Sprintf("field_visit_commission:%s", input.VisitID)
	}
	var operatorContextID, partnerID, partnerCategory string
	err := tx.QueryRow(`
		SELECT btrim(s.operator_context_id), COALESCE(s.partner_id,''), COALESCE(NULLIF(btrim(p.category),''),'default')
		FROM dsh_stores s
		LEFT JOIN dsh_partners p ON p.id=s.partner_id AND p.operator_context_id=s.operator_context_id
		WHERE s.id=$1`, input.StoreID).Scan(&operatorContextID, &partnerID, &partnerCategory)
	if err != nil {
		return fmt.Errorf("resolve field commission partner evidence: %w", err)
	}
	if operatorContextID == "" {
		return fmt.Errorf("store %s has no trusted OperatorContext for field commission", input.StoreID)
	}
	if strings.TrimSpace(partnerID) == "" {
		return fmt.Errorf("store %s has no partner for field commission", input.StoreID)
	}
	_, err = tx.Exec(`
		INSERT INTO dsh_field_commission_outbox
			(field_actor_id, visit_id, store_id, partner_id, partner_category,
			 commission_policy_id, idempotency_key)
		VALUES ($1, $2::uuid, $3, $4, $5, $6, $7)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		input.FieldActorID, input.VisitID, input.StoreID, partnerID,
		partnerCategory, nullableString(input.CommissionPolicyID), input.IdempotencyKey,
	)
	if err != nil {
		return fmt.Errorf("enqueue field commission outbox event: %w", err)
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
		SELECT outbox.id, outbox.event_id, outbox.event_type, btrim(store.operator_context_id),
		       outbox.field_actor_id, outbox.visit_id::text, outbox.store_id,
		       COALESCE(outbox.partner_id,''), outbox.partner_category,
		       COALESCE(outbox.commission_policy_id,''), outbox.correlation_id::text,
		       outbox.idempotency_key, outbox.occurred_at, outbox.attempt_count
		FROM dsh_field_commission_outbox outbox
		JOIN dsh_stores store ON store.id=outbox.store_id
		WHERE outbox.status = 'pending' AND outbox.next_retry_at <= NOW()
		  AND btrim(store.operator_context_id) <> ''
		ORDER BY outbox.created_at
		LIMIT $1
		FOR UPDATE OF outbox SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim field commission outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.EventID, &e.EventType, &e.OperatorContextID, &e.FieldActorID, &e.VisitID,
			&e.StoreID, &e.PartnerID, &e.PartnerCategory,
			&e.CommissionPolicyID, &e.CorrelationID, &e.IdempotencyKey,
			&e.OccurredAt, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan field commission outbox event: %w", err)
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
			UPDATE dsh_field_commission_outbox
			SET next_retry_at = NOW() + $2::interval, updated_at = NOW()
			WHERE id = ANY($1::uuid[])`, pqStringArray(ids), lease.String()); err != nil {
			return nil, fmt.Errorf("lease field commission outbox batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE dsh_field_commission_outbox
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`, id)
	return err
}

func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	next := attemptCount + 1
	backoff := time.Duration(1<<uint(min(next, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE dsh_field_commission_outbox
		SET attempt_count = $2, last_error = $3,
		    next_retry_at = NOW() + $4::interval, updated_at = NOW()
		WHERE id = $1::uuid`, id, next, cause.Error(), backoff.String())
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

func pqStringArray(values []string) string {
	out := "{"
	for i, value := range values {
		if i > 0 {
			out += ","
		}
		out += `"` + value + `"`
	}
	return out + "}"
}
