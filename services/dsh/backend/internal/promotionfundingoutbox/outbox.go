package promotionfundingoutbox

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

const (
	EventCommit  = "commit"
	EventRelease = "release"
	EventReverse = "reverse"
)

type Event struct {
	ID                      string
	EventType               string
	TenantID                string
	CheckoutIntentID        string
	CouponRedemptionID      string
	WLTReservationID        string
	OrderID                 string
	Reason                  string
	IdempotencyKey          string
	CorrelationID           string
	AttemptCount            int
}

type EnqueueInput struct {
	EventType               string
	TenantID                string
	CheckoutIntentID        string
	CouponRedemptionID      string
	WLTReservationID        string
	OrderID                 *string
	Reason                  string
	IdempotencyKey          string
	CorrelationID           string
}

func Enqueue(tx *sql.Tx, input EnqueueInput) error {
	if tx == nil || strings.TrimSpace(input.EventType) == "" || strings.TrimSpace(input.TenantID) == "" ||
		strings.TrimSpace(input.CheckoutIntentID) == "" || strings.TrimSpace(input.CouponRedemptionID) == "" ||
		strings.TrimSpace(input.WLTReservationID) == "" || strings.TrimSpace(input.IdempotencyKey) == "" ||
		strings.TrimSpace(input.CorrelationID) == "" {
		return fmt.Errorf("promotion funding outbox: required field is missing")
	}
	switch input.EventType {
	case EventCommit:
		if input.OrderID == nil || strings.TrimSpace(*input.OrderID) == "" {
			return fmt.Errorf("promotion funding outbox: commit requires orderId")
		}
	case EventRelease:
		if input.OrderID != nil || strings.TrimSpace(input.Reason) == "" {
			return fmt.Errorf("promotion funding outbox: release requires reason and no orderId")
		}
	case EventReverse:
		if input.OrderID == nil || strings.TrimSpace(*input.OrderID) == "" || strings.TrimSpace(input.Reason) == "" {
			return fmt.Errorf("promotion funding outbox: reverse requires orderId and reason")
		}
	default:
		return fmt.Errorf("promotion funding outbox: unsupported event type %q", input.EventType)
	}
	_, err := tx.Exec(`INSERT INTO dsh_promotion_funding_outbox
		(event_type,tenant_id,checkout_intent_id,coupon_redemption_id,
		 wlt_funding_reservation_id,order_id,reason,idempotency_key,correlation_id)
		VALUES ($1,$2,$3::uuid,$4::uuid,$5,$6::uuid,$7,$8,$9)
		ON CONFLICT (idempotency_key) DO NOTHING`,
		input.EventType,
		strings.TrimSpace(input.TenantID),
		strings.TrimSpace(input.CheckoutIntentID),
		strings.TrimSpace(input.CouponRedemptionID),
		strings.TrimSpace(input.WLTReservationID),
		input.OrderID,
		strings.TrimSpace(input.Reason),
		strings.TrimSpace(input.IdempotencyKey),
		strings.TrimSpace(input.CorrelationID),
	)
	if err != nil {
		return fmt.Errorf("enqueue promotion funding event: %w", err)
	}
	return nil
}

func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	if db == nil {
		return nil, fmt.Errorf("promotion funding outbox: db is nil")
	}
	if limit <= 0 || limit > 200 {
		limit = 20
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.Query(`SELECT id::TEXT,event_type,tenant_id,
		checkout_intent_id::TEXT,coupon_redemption_id::TEXT,
		wlt_funding_reservation_id,COALESCE(order_id::TEXT,''),reason,
		idempotency_key,correlation_id,attempt_count
		FROM dsh_promotion_funding_outbox
		WHERE status='pending' AND next_retry_at<=NOW()
		ORDER BY created_at
		LIMIT $1 FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim promotion funding outbox: %w", err)
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var event Event
		if err := rows.Scan(
			&event.ID,
			&event.EventType,
			&event.TenantID,
			&event.CheckoutIntentID,
			&event.CouponRedemptionID,
			&event.WLTReservationID,
			&event.OrderID,
			&event.Reason,
			&event.IdempotencyKey,
			&event.CorrelationID,
			&event.AttemptCount,
		); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(events) > 0 {
		ids := make([]string, len(events))
		for index, event := range events {
			ids[index] = event.ID
		}
		if _, err := tx.Exec(`UPDATE dsh_promotion_funding_outbox
			SET next_retry_at=NOW()+$2::interval,updated_at=NOW()
			WHERE id=ANY($1::uuid[])`, formatUUIDArray(ids), lease.String()); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`UPDATE dsh_promotion_funding_outbox
		SET status='sent',sent_at=NOW(),updated_at=NOW(),last_error=''
		WHERE id=$1::uuid`, id)
	return err
}

func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	next := attemptCount + 1
	backoff := time.Duration(1<<uint(min(next, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`UPDATE dsh_promotion_funding_outbox
		SET attempt_count=$2,last_error=$3,next_retry_at=NOW()+$4::interval,updated_at=NOW()
		WHERE id=$1::uuid`, id, next, cause.Error(), backoff.String())
	return err
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func formatUUIDArray(values []string) string {
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, `"`+strings.ReplaceAll(value, `"`, ``)+`"`)
	}
	return "{" + strings.Join(parts, ",") + "}"
}
