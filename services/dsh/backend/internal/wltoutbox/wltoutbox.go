package wltoutbox

import (
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
	EventType           string
	OrderID             string
	CaptainID           string // compatibility projection for old captain events
	CollectorType       string
	CollectorID         string
	PartnerID           string
	CheckoutIntentID    string
	ClientID            string
	TenantID            string
	Points              int64
	ReversalOfReference string
	ExternalReference   string
	Payload             map[string]any
	ReversalRequested   bool
	AttemptCount        int
}

func resolveTenant(tx *sql.Tx, checkoutIntentID string) (string, error) {
	if strings.TrimSpace(checkoutIntentID) == "" {
		return "", fmt.Errorf("checkout intent is required to resolve tenant context")
	}
	var tenantID string
	if err := tx.QueryRow(`
		SELECT tenant_id
		FROM dsh_checkout_intents
		WHERE id = $1::uuid`, checkoutIntentID).Scan(&tenantID); err != nil {
		return "", fmt.Errorf("resolve tenant context: %w", err)
	}
	if strings.TrimSpace(tenantID) == "" {
		return "", fmt.Errorf("tenant context is required")
	}
	return tenantID, nil
}

func validateCollector(collectorType, collectorID string) error {
	collectorType = strings.TrimSpace(collectorType)
	collectorID = strings.TrimSpace(collectorID)
	if collectorID == "" {
		return fmt.Errorf("collector id is required")
	}
	switch collectorType {
	case CollectorCaptain, CollectorStoreCourier, CollectorPartnerStore:
		return nil
	default:
		return fmt.Errorf("unsupported collector type %q", collectorType)
	}
}

// EnqueueDeliveryCompleted persists the COD collection actor independently from
// the fulfillment implementation. The amount is intentionally absent; WLT
// derives it from checkoutIntentID.
func EnqueueDeliveryCompleted(
	tx *sql.Tx,
	orderID,
	collectorType,
	collectorID,
	partnerID,
	checkoutIntentID string,
) error {
	if tx == nil {
		return fmt.Errorf("enqueue wlt delivery event: transaction is required")
	}
	if err := validateCollector(collectorType, collectorID); err != nil {
		return fmt.Errorf("enqueue wlt delivery event: %w", err)
	}
	if strings.TrimSpace(orderID) == "" || strings.TrimSpace(partnerID) == "" {
		return fmt.Errorf("enqueue wlt delivery event: order and partner are required")
	}
	tenantID, err := resolveTenant(tx, checkoutIntentID)
	if err != nil {
		return fmt.Errorf("enqueue wlt delivery event: %w", err)
	}
	captainID := ""
	if collectorType == CollectorCaptain {
		captainID = collectorID
	}
	_, err = tx.Exec(`
		INSERT INTO dsh_wlt_outbox_events
		  (event_type,tenant_id,order_id,captain_id,collector_type,collector_id,partner_id,checkout_intent_id)
		VALUES ($1,$2,NULLIF($3,'')::uuid,NULLIF($4,''),$5,$6,$7,NULLIF($8,'')::uuid)
		ON CONFLICT DO NOTHING`,
		EventTypeDeliveryCompleted, tenantID, orderID, captainID, collectorType, collectorID, partnerID, checkoutIntentID,
	)
	if err != nil {
		return fmt.Errorf("enqueue wlt delivery event: %w", err)
	}
	return nil
}

// Enqueue accepts the canonical tenant-aware shape and the transitional
// delivery-completion shape used by older callers. Delivery calls are converted
// to a captain collector; new non-captain callers must use
// EnqueueDeliveryCompleted explicitly.
func Enqueue(tx *sql.Tx, eventType string, values ...string) error {
	if tx == nil {
		return fmt.Errorf("enqueue wlt outbox event: transaction is required")
	}

	var tenantID, orderID, captainID, partnerID, checkoutIntentID string
	switch len(values) {
	case 5:
		tenantID, orderID, captainID, partnerID, checkoutIntentID = values[0], values[1], values[2], values[3], values[4]
	case 4:
		orderID, captainID, partnerID, checkoutIntentID = values[0], values[1], values[2], values[3]
		resolvedTenant, err := resolveTenant(tx, checkoutIntentID)
		if err != nil {
			return fmt.Errorf("enqueue wlt outbox event: %w", err)
		}
		tenantID = resolvedTenant
	default:
		return fmt.Errorf("enqueue wlt outbox event: invalid argument shape")
	}

	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return fmt.Errorf("enqueue wlt outbox event: tenant context is required")
	}
	if eventType == EventTypeDeliveryCompleted {
		if err := validateCollector(CollectorCaptain, captainID); err != nil {
			return fmt.Errorf("enqueue wlt outbox event: %w", err)
		}
		_, err := tx.Exec(`
			INSERT INTO dsh_wlt_outbox_events
			  (event_type,tenant_id,order_id,captain_id,collector_type,collector_id,partner_id,checkout_intent_id)
			VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,$6,$7,NULLIF($8,'')::uuid)
			ON CONFLICT DO NOTHING`,
			eventType, tenantID, orderID, captainID, CollectorCaptain, captainID, partnerID, checkoutIntentID,
		)
		if err != nil {
			return fmt.Errorf("enqueue wlt outbox event: %w", err)
		}
		return nil
	}

	_, err := tx.Exec(`
		INSERT INTO dsh_wlt_outbox_events
		  (event_type,tenant_id,order_id,captain_id,partner_id,checkout_intent_id)
		VALUES ($1,$2,NULLIF($3,'')::uuid,NULLIF($4,''),$5,NULLIF($6,'')::uuid)
		ON CONFLICT DO NOTHING`, eventType, tenantID, orderID, captainID, partnerID, checkoutIntentID)
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

	if _, err := tx.Exec(`
		UPDATE dsh_wlt_outbox_events
		SET status='cancelled',last_error='cancelled after loyalty lease expired with refund requested',updated_at=NOW()
		WHERE status='processing' AND next_retry_at<=NOW()
		  AND event_type='loyalty_earned' AND reversal_requested=TRUE`); err != nil {
		return nil, fmt.Errorf("cancel refunded expired loyalty leases: %w", err)
	}

	rows, err := tx.Query(`
		SELECT id,event_type,COALESCE(order_id::text,''),COALESCE(captain_id,''),
		       COALESCE(collector_type,''),COALESCE(collector_id,''),
		       COALESCE(partner_id,''),COALESCE(checkout_intent_id::text,''),
		       COALESCE(client_id,''),tenant_id,COALESCE(points,0),COALESCE(reversal_of_reference,''),
		       COALESCE(external_reference,''),COALESCE(payload,'{}'::jsonb),COALESCE(reversal_requested,FALSE),attempt_count
		FROM dsh_wlt_outbox_events
		WHERE status IN ('pending','processing') AND next_retry_at<=NOW()
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
			&event.ID, &event.EventType, &event.OrderID, &event.CaptainID,
			&event.CollectorType, &event.CollectorID, &event.PartnerID,
			&event.CheckoutIntentID, &event.ClientID, &event.TenantID, &event.Points,
			&event.ReversalOfReference, &event.ExternalReference, &payload,
			&event.ReversalRequested, &event.AttemptCount,
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
	defer tx.Rollback()

	var eventType, tenantID, orderID, partnerID, checkoutIntentID, clientID string
	var points int64
	var reversalRequested bool
	var payload []byte
	err = tx.QueryRow(`
		SELECT event_type,tenant_id,COALESCE(order_id::text,''),COALESCE(partner_id,''),
		       COALESCE(checkout_intent_id::text,''),COALESCE(client_id,''),COALESCE(points,0),
		       COALESCE(reversal_requested,FALSE),COALESCE(payload,'{}'::jsonb)
		FROM dsh_wlt_outbox_events
		WHERE id=$1::uuid AND status='processing'
		FOR UPDATE`, id).Scan(
		&eventType, &tenantID, &orderID, &partnerID, &checkoutIntentID, &clientID,
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
			  (event_type,tenant_id,order_id,captain_id,partner_id,checkout_intent_id,
			   client_id,points,reversal_of_reference,payload)
			VALUES ('loyalty_reversed',$1,$2::uuid,NULL,$3,NULLIF($4,'')::uuid,$5,$6,$7,$8)
			ON CONFLICT DO NOTHING`, tenantID, orderID, partnerID, checkoutIntentID, clientID, points, externalReference, reversalPayload); err != nil {
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
	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE dsh_wlt_outbox_events
		SET status=CASE
		      WHEN event_type='loyalty_earned' AND reversal_requested=TRUE THEN 'cancelled'
		      ELSE 'pending'
		    END,
		    attempt_count=$2,last_error=$3,next_retry_at=NOW()+$4::interval,updated_at=NOW()
		WHERE id=$1::uuid AND status='processing'`, id, nextAttempt, cause.Error(), backoff.String())
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
