// Package dshoutbox implements a durable outbox for payment-session and
// completed-refund events that WLT must eventually deliver to DSH.
package dshoutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

const (
	EventTypeFailed   = "failed"
	EventTypeCaptured = "captured"
	EventTypeExpired  = "expired"
	EventTypeRefunded = "refunded"
)

type Event struct {
	ID                string
	EventType         string
	PaymentSessionID  string
	OperatorContextID string
	CheckoutIntentID  *string
	SpecialRequestID  *string
	OrderID           string
	RefundReference   string
	Reason            string
	CorrelationID     string
	PaymentMethod     string
	AttemptCount      int
}

// Enqueue records a payment-session outcome. Re-enqueuing the same
// (sessionID,eventType) pair is a no-op.
func Enqueue(tx *sql.Tx, eventType, sessionID string, operatorContextID string, checkoutIntentID, specialRequestID *string) error {
	if err := requireOperatorContextID(operatorContextID); err != nil {
		return err
	}
	if _, err := tx.Exec(`
		INSERT INTO wlt_dsh_outbox_events (event_type, payment_session_id, operator_context_id, checkout_intent_id, special_request_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (payment_session_id, event_type) WHERE refund_reference IS NULL DO NOTHING`,
		eventType, sessionID, operatorContextID, checkoutIntentID, specialRequestID,
	); err != nil {
		return fmt.Errorf("enqueue dsh outbox event: %w", err)
	}
	return nil
}

// EnqueueRefund records the privacy-safe completed-refund projection in the
// same transaction as ledger posting and refund completion. The refund
// reference is the idempotency identity, allowing multiple partial refunds for
// one payment session without collapsing them into one event.
func EnqueueRefund(tx *sql.Tx, refundID, sessionID, operatorContextID, orderID, reason, correlationID string, checkoutIntentID, specialRequestID *string) error {
	if refundID == "" || sessionID == "" || operatorContextID == "" || orderID == "" {
		return fmt.Errorf("refundId, paymentSessionId, operatorContextId and orderId are required for refund outbox")
	}
	_, err := tx.Exec(`
		INSERT INTO wlt_dsh_outbox_events
			(event_type,payment_session_id,operator_context_id,checkout_intent_id,special_request_id,
			 order_id,refund_reference,reason,correlation_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (refund_reference,event_type) WHERE refund_reference IS NOT NULL DO NOTHING`,
		EventTypeRefunded, sessionID, operatorContextID, checkoutIntentID, specialRequestID,
		orderID, refundID, reason, correlationID,
	)
	if err != nil {
		return fmt.Errorf("enqueue refund dsh outbox event: %w", err)
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
		SELECT o.id, o.event_type, o.payment_session_id,
		       o.operator_context_id,
		       o.checkout_intent_id, o.special_request_id,
		       COALESCE(to_jsonb(o)->>'order_id',''),
		       COALESCE(to_jsonb(o)->>'refund_reference',''),
		       COALESCE(to_jsonb(o)->>'reason',''),
		       COALESCE(to_jsonb(o)->>'correlation_id',''),
		       p.payment_method,
		       o.attempt_count
		FROM wlt_dsh_outbox_events o
		JOIN wlt_payment_sessions p ON p.id = o.payment_session_id
		WHERE o.status = 'pending' AND o.next_retry_at <= NOW()
		ORDER BY o.created_at
		LIMIT $1
		FOR UPDATE OF o SKIP LOCKED`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim dsh outbox batch: %w", err)
	}
	var events []Event
	for rows.Next() {
		var e Event
		if err := rows.Scan(
			&e.ID, &e.EventType, &e.PaymentSessionID, &e.OperatorContextID,
			&e.CheckoutIntentID, &e.SpecialRequestID, &e.OrderID, &e.RefundReference,
			&e.Reason, &e.CorrelationID, &e.PaymentMethod, &e.AttemptCount,
		); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan dsh outbox event: %w", err)
		}
		if err := requireOperatorContextID(e.OperatorContextID); err != nil {
			return nil, fmt.Errorf("claim dsh outbox event %s: %w", e.ID, err)
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
			WHERE id = ANY($1::uuid[])`, pqStringArray(ids), lease.String()); err != nil {
			return nil, fmt.Errorf("lease dsh outbox batch: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return events, nil
}

func MarkSent(db *sql.DB, id string) error {
	_, err := db.Exec(`
		UPDATE wlt_dsh_outbox_events
		SET status = 'sent', updated_at = NOW()
		WHERE id = $1::uuid`, id)
	return err
}

func MarkFailed(db *sql.DB, id string, attemptCount int, cause error) error {
	nextAttempt := attemptCount + 1
	if nextAttempt > 15 {
		_, err := db.Exec(`
			UPDATE wlt_dsh_outbox_events
			SET status = 'failed', attempt_count = $2, last_error = $3, updated_at = NOW()
			WHERE id = $1::uuid`, id, nextAttempt, cause.Error())
		return err
	}

	backoff := time.Duration(1<<uint(min(nextAttempt, 10))) * time.Second
	if backoff > 30*time.Minute {
		backoff = 30 * time.Minute
	}
	_, err := db.Exec(`
		UPDATE wlt_dsh_outbox_events
		SET attempt_count = $2, last_error = $3, next_retry_at = NOW() + $4::interval, updated_at = NOW()
		WHERE id = $1::uuid`, id, nextAttempt, cause.Error(), backoff.String())
	return err
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func requireOperatorContextID(operatorContextID string) error {
	if strings.TrimSpace(operatorContextID) == "" {
		return fmt.Errorf("dsh outbox OperatorContextId is required")
	}
	return nil
}

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

// ErrEventNotEligibleForRetry is returned when a retry is requested for an
// outbox event that is not parked in the terminal 'failed' state.
var ErrEventNotEligibleForRetry = fmt.Errorf("dsh outbox event is not eligible for retry")

// RequeueFailedForOperatorContext is the explicit operator recovery
// transition for an outbox event that exhausted its delivery attempts. A
// terminal 'failed' event otherwise has no exit: the outcome it carries would
// be permanently undeliverable and DSH's projection would diverge from WLT's
// truth with no tooling to re-drive delivery. The retry is scoped to the
// authenticated OperatorContext and requires an explicit reason.
func RequeueFailedForOperatorContext(ctx context.Context, db *sql.DB, eventID, reason string) error {
	eventID = strings.TrimSpace(eventID)
	reason = strings.TrimSpace(reason)
	if eventID == "" || reason == "" {
		return fmt.Errorf("eventId and reason are required")
	}
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return err
	}
	result, err := db.ExecContext(ctx, `
		UPDATE wlt_dsh_outbox_events
		SET status='pending', attempt_count=0, next_retry_at=NOW(),
		    last_error=$3, updated_at=NOW()
		WHERE id=$1::uuid AND status='failed' AND operator_context_id=$2`,
		eventID, operatorContextID, "manual retry: "+reason)
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

// HandleRetryFailedEvent is the governed operator surface for re-driving a
// parked delivery: it requires a delegated finance principal, an
// authenticated OperatorContext, and an explicit reason, mirroring the
// reconciliation-case resolution handlers.
func HandleRetryFailedEvent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			Reason string `json:"reason"`
		}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		principal, principalErr := shared.RequireDelegatedFinancePrincipal(r.Context())
		if principalErr != nil {
			shared.SendError(w, http.StatusForbidden, "AUTHENTICATED_PRINCIPAL_REQUIRED", principalErr.Error())
			return
		}
		if err := RequeueFailedForOperatorContext(r.Context(), db, r.PathValue("eventId"), input.Reason); err != nil {
			if errors.Is(err, ErrEventNotEligibleForRetry) {
				shared.SendError(w, http.StatusConflict, "INVALID_STATE", "dsh outbox event is not parked in failed state")
				return
			}
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{
			"outboxEvent": map[string]any{
				"id":        r.PathValue("eventId"),
				"status":    "retry_scheduled",
				"retriedBy": principal,
			},
		})
	}
}
