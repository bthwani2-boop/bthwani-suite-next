package wltoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	EventTypeDeliveryCompleted       = "delivery_completed"
	EventTypeLoyaltyEarned           = "loyalty_earned"
	EventTypeLoyaltyReversed         = "loyalty_reversed"
	EventTypePromotionFundingCommit  = "promotion_funding_commit"
	EventTypePromotionFundingRelease = "promotion_funding_release"
	EventTypePromotionFundingReverse = "promotion_funding_reverse"
)

const (
	CollectorCaptain      = "captain"
	CollectorStoreCourier = "store_courier"
	CollectorPartnerStore = "partner_store"
)

type Event struct {
	ID                  string
	Status              string
	EventType           string
	OrderID             string
	CollectorType       string
	CollectorID         string
	PartnerID           string
	CheckoutIntentID    string
	ClientID            string
	OperatorContextID   string
	Points              int64
	ReversalOfReference string
	ExternalReference   string
	Payload             map[string]any
	ReversalRequested   bool
	AttemptCount        int
}

func resolveOperatorContext(tx *sql.Tx, checkoutIntentID string) (string, error) {
	if strings.TrimSpace(checkoutIntentID) == "" {
		return "", fmt.Errorf("checkout intent is required to resolve OperatorContext context")
	}
	var operatorContextID string
	if err := tx.QueryRow(`
                SELECT operator_context_id
                FROM dsh_checkout_intents
                WHERE id = $1::uuid`, checkoutIntentID).Scan(&operatorContextID); err != nil {
		return "", fmt.Errorf("resolve OperatorContext context: %w", err)
	}
	if strings.TrimSpace(operatorContextID) == "" {
		return "", fmt.Errorf("OperatorContext context is required")
	}
	return operatorContextID, nil
}

// EnqueueDeliveryCompleted persists the canonical captain-funded COD
// completion event. WLT derives the immutable amount from checkoutIntentID.
func EnqueueDeliveryCompleted(
	tx *sql.Tx,
	orderID,
	captainID,
	partnerID,
	checkoutIntentID string,
) error {
	if tx == nil {
		return fmt.Errorf("enqueue wlt delivery event: transaction is required")
	}
	if strings.TrimSpace(orderID) == "" || strings.TrimSpace(captainID) == "" || strings.TrimSpace(partnerID) == "" {
		return fmt.Errorf("enqueue wlt delivery event: order, captain, and partner are required")
	}
	operatorContextID, err := resolveOperatorContext(tx, checkoutIntentID)
	if err != nil {
		return fmt.Errorf("enqueue wlt delivery event: %w", err)
	}
	_, err = tx.Exec(`
				INSERT INTO dsh_wlt_outbox_events
				  (event_type,operator_context_id,order_id,collector_type,collector_id,partner_id,checkout_intent_id)
				VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,$6,NULLIF($7,'')::uuid)
				ON CONFLICT DO NOTHING`,
		EventTypeDeliveryCompleted, operatorContextID, orderID, CollectorCaptain, captainID, partnerID, checkoutIntentID,
	)
	if err != nil {
		return fmt.Errorf("enqueue wlt delivery event: %w", err)
	}
	return nil
}

func ClaimBatch(db *sql.DB, limit int, lease time.Duration) ([]Event, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`
                UPDATE dsh_wlt_outbox_events
                SET status='cancelled',last_error='cancelled after loyalty lease expired with refund requested',updated_at=NOW()
                WHERE status='processing' AND next_retry_at<=NOW()
                  AND event_type='loyalty_earned' AND reversal_requested=TRUE`); err != nil {
		return nil, fmt.Errorf("cancel refunded expired loyalty leases: %w", err)
	}

	rows, err := tx.Query(`
			SELECT id,status,event_type,COALESCE(order_id::text,''),
			       COALESCE(collector_type,''),COALESCE(collector_id,''),
                       COALESCE(partner_id,''),COALESCE(checkout_intent_id::text,''),
                       COALESCE(client_id,''),operator_context_id,COALESCE(points,0),COALESCE(reversal_of_reference,''),
                       COALESCE(external_reference,''),COALESCE(payload,'{}'::jsonb),COALESCE(reversal_requested,FALSE),attempt_count
                FROM dsh_wlt_outbox_events
                WHERE status IN ('pending','processing','unknown') AND next_retry_at<=NOW()
                  AND NOT (event_type='loyalty_earned' AND reversal_requested=TRUE)
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
			&event.ID, &event.Status, &event.EventType, &event.OrderID,
			&event.CollectorType, &event.CollectorID, &event.PartnerID,
			&event.CheckoutIntentID, &event.ClientID, &event.OperatorContextID, &event.Points,
			&event.ReversalOfReference, &event.ExternalReference, &payload,
			&event.ReversalRequested, &event.AttemptCount,
		); err != nil {
			_ = rows.Close()
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
	_ = rows.Close()

	if len(events) > 0 {
		ids := make([]string, len(events))
		for i, event := range events {
			ids[i] = event.ID
		}
		if _, err := tx.Exec(`
                        UPDATE dsh_wlt_outbox_events
                        SET status='processing',next_retry_at=NOW()+$2::interval,updated_at=NOW()
                        WHERE id=ANY($1::uuid[])`, pqStringArray(ids), lease.String()); err != nil {
			return nil, fmt.Errorf("lease wlt outbox batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

func MarkSent(db *sql.DB, id string) error { return MarkSentWithReference(db, id, "") }

func MarkSentWithReference(db *sql.DB, id, externalReference string) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var eventType, operatorContextID, orderID, partnerID, checkoutIntentID, clientID string
	var points int64
	var reversalRequested bool
	var payload []byte
	err = tx.QueryRow(`
                SELECT event_type,operator_context_id,COALESCE(order_id::text,''),COALESCE(partner_id,''),
                       COALESCE(checkout_intent_id::text,''),COALESCE(client_id,''),COALESCE(points,0),
                       COALESCE(reversal_requested,FALSE),COALESCE(payload,'{}'::jsonb)
                FROM dsh_wlt_outbox_events
                WHERE id=$1::uuid AND status='processing'
                FOR UPDATE`, id).Scan(
		&eventType, &operatorContextID, &orderID, &partnerID, &checkoutIntentID, &clientID,
		&points, &reversalRequested, &payload,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	if eventType == EventTypeLoyaltyEarned && externalReference == "" {
		return fmt.Errorf("loyalty earn event requires WLT entry reference")
	}
	if _, err := tx.Exec(`
                UPDATE dsh_wlt_outbox_events
                SET status='sent',external_reference=CASE WHEN $2='' THEN external_reference ELSE $2 END,
                    updated_at=NOW()
                WHERE id=$1::uuid AND status='processing'`, id, externalReference); err != nil {
		return err
	}

	if eventType == EventTypeLoyaltyEarned && reversalRequested {
		metadata := map[string]any{}
		_ = json.Unmarshal(payload, &metadata)
		metadata["reason"] = "confirmed refund arrived while loyalty earn was processing"
		reversalPayload, marshalErr := json.Marshal(metadata)
		if marshalErr != nil {
			return marshalErr
		}
		if _, err := tx.Exec(`
                        INSERT INTO dsh_wlt_outbox_events
                          (event_type,operator_context_id,order_id,captain_id,partner_id,checkout_intent_id,
                           client_id,points,reversal_of_reference,payload)
                        VALUES ('loyalty_reversed',$1,$2::uuid,NULL,$3,NULLIF($4,'')::uuid,$5,$6,$7,$8)
                        ON CONFLICT DO NOTHING`, operatorContextID, orderID, partnerID, checkoutIntentID, clientID, points, externalReference, reversalPayload); err != nil {
			return err
		}
	}

	if eventType == EventTypePromotionFundingCommit || eventType == EventTypePromotionFundingRelease || eventType == EventTypePromotionFundingReverse {
		redemptionID, _ := payloadString(payload, "couponRedemptionId")
		target := map[string]string{
			EventTypePromotionFundingCommit:  "committed",
			EventTypePromotionFundingRelease: "released",
			EventTypePromotionFundingReverse: "reversed",
		}[eventType]
		if redemptionID == "" {
			return fmt.Errorf("promotion funding event lacks couponRedemptionId")
		}
		if _, err := tx.Exec(`UPDATE dsh_coupon_redemptions SET funding_status=$2,updated_at=NOW() WHERE id=$1::uuid`, redemptionID, target); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	if nextAttempt > 15 {
		_, err := db.ExecContext(context.Background(), `
                        UPDATE dsh_wlt_outbox_events
                        SET status = 'failed', attempt_count = $2, last_error = $3, updated_at = NOW()
                        WHERE id = $1::uuid`, id, nextAttempt, cause.Error())
		return err
	}

	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.ExecContext(context.Background(), `
                UPDATE dsh_wlt_outbox_events
                SET status=CASE
                      WHEN event_type='loyalty_earned' AND reversal_requested=TRUE THEN 'cancelled'
                      ELSE 'pending'
                    END,
                    attempt_count=$2,last_error=$3,next_retry_at=NOW()+$4::interval,updated_at=NOW()
                WHERE id=$1::uuid AND status='processing'`, id, nextAttempt, cause.Error(), backoff.String())
	return err
}

// MaxReadbackAttempts bounds how long an ambiguous result may stay in the
// readback-only 'unknown' state. A readback that keeps failing (for example a
// broken readback contract) must escalate to the visible terminal 'failed'
// state instead of looping every five seconds forever with no operator
// signal — mirroring the checkout finance closure outbox policy.
const MaxReadbackAttempts = 5

// MarkUnknown is deliberately separate from MarkFailed: a transport error
// leaves the WLT side ambiguous, so retry is illegal until canonical readback
// proves the mutation absent.
func MarkUnknown(db *sql.DB, id string, attemptCount int, cause error) error {
	message := "unknown WLT result"
	if cause != nil {
		message = cause.Error()
	}
	_, err := db.ExecContext(context.Background(), `
                UPDATE dsh_wlt_outbox_events
                SET status=CASE WHEN readback_attempt_count+1 >= $4 THEN 'failed' ELSE 'unknown' END,
                    attempt_count=$2,last_error=$3,next_retry_at=NOW()+INTERVAL '5 seconds',
                    last_readback_at=NOW(),readback_attempt_count=readback_attempt_count+1,updated_at=NOW()
                WHERE id=$1::uuid AND status='processing'`, id, attemptCount+1, message, MaxReadbackAttempts)
	return err
}

func payloadString(payload []byte, key string) (string, error) {
	values := map[string]any{}
	if err := json.Unmarshal(payload, &values); err != nil {
		return "", err
	}
	value, ok := values[key].(string)
	if !ok {
		return "", nil
	}
	return value, nil
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

// ErrEventNotEligibleForRetry is returned when a retry is requested for a
// wlt outbox event that is not parked in the terminal 'failed' state.
var ErrEventNotEligibleForRetry = fmt.Errorf("wlt outbox event is not eligible for retry")

// RetryFailedForOperatorContext is the explicit operator recovery transition
// for a WLT outbox event that exhausted its delivery or readback attempts.
// Re-dispatch is safe because every WLT delivery this outbox performs carries
// a deterministic idempotency key that WLT deduplicates; the readback
// counters are reset so the recovered event starts a clean cycle.
func RetryFailedForOperatorContext(ctx context.Context, db *sql.DB, id, operatorContextID, reason string) error {
	id = strings.TrimSpace(id)
	reason = strings.TrimSpace(reason)
	operatorContextID = strings.TrimSpace(operatorContextID)
	if id == "" || reason == "" || operatorContextID == "" {
		return fmt.Errorf("event id, reason and operator context are required")
	}
	result, err := db.ExecContext(ctx, `
                UPDATE dsh_wlt_outbox_events
                SET status='pending', attempt_count=0, readback_attempt_count=0,
                    last_readback_at=NULL, next_retry_at=NOW(),
                    last_error=$3, updated_at=NOW()
                WHERE id=$1::uuid AND status='failed' AND operator_context_id=$2`,
		id, operatorContextID, "manual retry: "+reason)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return ErrEventNotEligibleForRetry
	}
	return nil
}
