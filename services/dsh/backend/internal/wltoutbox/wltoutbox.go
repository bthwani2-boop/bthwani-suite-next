// Package wltoutbox implements durable DSH -> WLT events. Operational and
// financial facts are committed with their outbox row, then retried until WLT
// accepts them idempotently.
package wltoutbox

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

const (
	EventTypeDeliveryCompleted = "delivery_completed"
	EventTypeLoyaltyEarned      = "loyalty_earned"
	EventTypeLoyaltyReversed    = "loyalty_reversed"
)

type Event struct {
	ID                  string
	EventType           string
	OrderID             string
	CaptainID           string
	PartnerID           string
	CheckoutIntentID    string
	ClientID            string
	Points              int64
	ReversalOfReference string
	ExternalReference   string
	Payload             map[string]any
	AttemptCount        int
}

func Enqueue(tx *sql.Tx, eventType, orderID, captainID, partnerID, checkoutIntentID string) error {
	_, err := tx.Exec(`
		INSERT INTO dsh_wlt_outbox_events
			(event_type,order_id,captain_id,partner_id,checkout_intent_id)
		VALUES ($1,$2::uuid,$3,$4,$5::uuid)
		ON CONFLICT (order_id,event_type) DO NOTHING`,
		eventType, orderID, captainID, partnerID, checkoutIntentID,
	)
	if err != nil {
		return fmt.Errorf("enqueue wlt outbox event: %w", err)
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
		SELECT id,event_type,order_id::text,COALESCE(captain_id,''),COALESCE(partner_id,''),
		       checkout_intent_id::text,client_id,points,reversal_of_reference,
		       external_reference,payload,attempt_count
		FROM dsh_wlt_outbox_events
		WHERE status='pending' AND next_retry_at<=NOW()
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim wlt outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var event Event
		var payload []byte
		if err := rows.Scan(
			&event.ID, &event.EventType, &event.OrderID, &event.CaptainID,
			&event.PartnerID, &event.CheckoutIntentID, &event.ClientID,
			&event.Points, &event.ReversalOfReference, &event.ExternalReference,
			&payload, &event.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan wlt outbox event: %w", err)
		}
		event.Payload = map[string]any{}
		if len(payload) > 0 {
			_ = json.Unmarshal(payload, &event.Payload)
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()

	if len(events) > 0 {
		ids := make([]string, len(events))
		for i, event := range events {
			ids[i] = event.ID
		}
		if _, err := tx.Exec(`
			UPDATE dsh_wlt_outbox_events
			SET next_retry_at=NOW()+$2::interval,updated_at=NOW()
			WHERE id=ANY($1::uuid[])`, pqStringArray(ids), lease.String()); err != nil {
			return nil, fmt.Errorf("lease wlt outbox batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

func MarkSent(db *sql.DB, id string) error {
	return MarkSentWithReference(db, id, "")
}

func MarkSentWithReference(db *sql.DB, id, externalReference string) error {
	_, err := db.Exec(`
		UPDATE dsh_wlt_outbox_events
		SET status='sent',external_reference=CASE WHEN $2='' THEN external_reference ELSE $2 END,
		    updated_at=NOW()
		WHERE id=$1::uuid`, id, externalReference)
	return err
}

func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE dsh_wlt_outbox_events
		SET attempt_count=$2,last_error=$3,next_retry_at=NOW()+$4::interval,updated_at=NOW()
		WHERE id=$1::uuid`, id, nextAttempt, cause.Error(), backoff.String())
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
	for i, value := range values {
		if i > 0 {
			out += ","
		}
		out += `"` + value + `"`
	}
	return out + "}"
}
