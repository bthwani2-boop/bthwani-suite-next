package checkoutfinanceoutbox

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type DeliveryResult struct {
	Action           string
	SessionStatus    string
	RefundID         string
	PaymentSessionID string
}

func financialProjection(result DeliveryResult) (status, reference string, err error) {
	switch strings.TrimSpace(result.Action) {
	case "expired":
		status = "session_expired"
		reference = result.PaymentSessionID
	case "refund_requested":
		status = "refund_requested"
		reference = result.RefundID
	case "none":
		status = "no_action"
		reference = result.PaymentSessionID
	case "cod_reservation_released":
		status = "no_action"
		reference = result.PaymentSessionID
	default:
		return "", "", fmt.Errorf("unsupported financial closure action %q", result.Action)
	}
	reference = strings.TrimSpace(reference)
	if reference == "" {
		return "", "", fmt.Errorf("financial closure action %q is missing its WLT reference", result.Action)
	}
	return status, reference, nil
}

func errorText(cause error) string {
	if cause == nil {
		return "checkout finance outbox transition failed without an error"
	}
	return cause.Error()
}

func backoff(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 10 {
		attempt = 10
	}
	delay := time.Duration(1<<uint(attempt)) * time.Second
	if delay > 30*time.Minute {
		return 30 * time.Minute
	}
	return delay
}

func intervalValue(duration time.Duration) string {
	return fmt.Sprintf("%.6f seconds", duration.Seconds())
}

func updateFailedOrderProjection(tx *sql.Tx, orderID string) error {
	if strings.TrimSpace(orderID) == "" {
		return nil
	}
	if _, err := tx.Exec(`
		UPDATE dsh_orders
		SET financial_closure_status='failed', updated_at=NOW()
		WHERE id=$1::uuid`, orderID); err != nil {
		return err
	}
	_, err := tx.Exec(`
		UPDATE dsh_order_cancellations
		SET financial_closure_status='failed', updated_at=NOW()
		WHERE order_id=$1::uuid`, orderID)
	return err
}

func updatePendingOrderProjection(tx *sql.Tx, orderID string) error {
	if strings.TrimSpace(orderID) == "" {
		return nil
	}
	if _, err := tx.Exec(`
		UPDATE dsh_orders
		SET financial_closure_status='pending', financial_closure_reference=NULL, updated_at=NOW()
		WHERE id=$1::uuid`, orderID); err != nil {
		return err
	}
	_, err := tx.Exec(`
		UPDATE dsh_order_cancellations
		SET financial_closure_status='pending', financial_reference=NULL, updated_at=NOW()
		WHERE order_id=$1::uuid`, orderID)
	return err
}

func markLeaseTransition(tx *sql.Tx, id, leaseToken string, query string, args ...any) (bool, error) {
	args = append([]any{id, leaseToken}, args...)
	result, err := tx.Exec(query, args...)
	if err != nil {
		return false, err
	}
	count, err := result.RowsAffected()
	return count == 1, err
}

// MarkSentWithResult is the only successful terminal transition. The lease
// token fences stale workers, and the outbox/order/cancellation projection is
// committed as one transaction.
func MarkSentWithResult(db *sql.DB, id, leaseToken string, result DeliveryResult) error {
	status, reference, err := financialProjection(result)
	if err != nil {
		return err
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var orderID sql.NullString
	updated, err := markLeaseTransition(tx, id, leaseToken, `
		UPDATE dsh_checkout_financial_closure_outbox
		SET status='sent', result_action=$3, result_reference=NULLIF($4,''),
			    completed_at=NOW(), last_error=NULL, failure_disposition='none',
			    failure_classification='PROVEN_APPLIED',
		    diagnostic_code=NULL, lease_token=NULL, lease_expires_at=NULL,
		    updated_at=NOW()
		WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`, result.Action, reference)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	if err := tx.QueryRow(`
		SELECT order_id::text
		FROM dsh_checkout_financial_closure_outbox WHERE id=$1::uuid`, id).Scan(&orderID); err != nil {
		return err
	}
	if orderID.Valid && orderID.String != "" && result.Action != EventTypeReleaseCodReservation && result.Action != "cod_reservation_released" {
		if _, err := tx.Exec(`
			UPDATE dsh_orders
			SET financial_closure_status=$2,
			    financial_closure_reference=NULLIF($3,''), updated_at=NOW()
			WHERE id=$1::uuid`, orderID.String, status, reference); err != nil {
			return err
		}
		if _, err := tx.Exec(`
			UPDATE dsh_order_cancellations
			SET financial_closure_status=$2,
			    financial_reference=NULLIF($3,''), updated_at=NOW()
			WHERE order_id=$1::uuid`, orderID.String, status, reference); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// MarkDeliveryFailure records a definitive delivery failure under the current
// lease. It retries with bounded exponential backoff and only projects failed
// after the delivery attempt budget is exhausted.
func MarkDeliveryFailure(db *sql.DB, event Event, cause error) error {
	nextAttempt := event.AttemptCount + 1
	message := errorText(cause)
	terminal := nextAttempt >= MaxDeliveryAttempts
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var query string
	var args []any
	if terminal {
		query = `
			UPDATE dsh_checkout_financial_closure_outbox
			SET status='failed', attempt_count=$3, last_error=$4,
			    failure_disposition='manual_retry_required', failure_classification='PROVEN_REJECTED', diagnostic_code='max_attempts_exhausted',
			    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`
		args = []any{nextAttempt, message}
	} else {
		query = `
			UPDATE dsh_checkout_financial_closure_outbox
			SET status='pending', attempt_count=$3, last_error=$4,
			    failure_disposition='retry_scheduled', diagnostic_code='delivery_failed',
			    next_retry_at=NOW()+$5::interval, lease_token=NULL, lease_expires_at=NULL,
			    updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`
		args = []any{nextAttempt, message, intervalValue(backoff(nextAttempt))}
	}
	updated, err := markLeaseTransition(tx, event.ID, event.LeaseToken, query, args...)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	if terminal && event.EventType != EventTypeReleaseCodReservation {
		if err := updateFailedOrderProjection(tx, event.OrderID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// MarkOutcomeUnknown durably separates an indeterminate WLT mutation from an
// ordinary retry. The worker must read WLT before any retry. A bounded failure
// retains an explicit reconciliation disposition and does not claim a false
// order-level financial result.
func MarkOutcomeUnknown(db *sql.DB, event Event, cause error) error {
	nextAttempt := event.AttemptCount
	if event.Status != "unknown" {
		nextAttempt++
	}
	nextReadback := event.ReadbackAttemptCount + 1
	message := errorText(cause)
	terminal := nextReadback >= MaxReadbackAttempts
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var query string
	var args []any
	if terminal {
		query = `
			UPDATE dsh_checkout_financial_closure_outbox
			SET status='failed', attempt_count=$3, readback_attempt_count=$4, last_error=$5,
			    failure_disposition='reconciliation_required', failure_classification='UNKNOWN_REQUIRES_READBACK', diagnostic_code='wlt_outcome_unknown',
			    last_readback_at=NOW(), lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`
		args = []any{nextAttempt, nextReadback, message}
	} else {
		query = `
			UPDATE dsh_checkout_financial_closure_outbox
			SET status='unknown', attempt_count=$3, readback_attempt_count=$4, last_error=$5,
			    failure_disposition='reconciliation_required', failure_classification='UNKNOWN_REQUIRES_READBACK', diagnostic_code='wlt_outcome_unknown',
			    last_readback_at=NOW(), next_retry_at=NOW()+$6::interval, lease_token=NULL, lease_expires_at=NULL,
			    updated_at=NOW()
			WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`
		args = []any{nextAttempt, nextReadback, message, intervalValue(backoff(nextReadback + 2))}
	}
	updated, err := markLeaseTransition(tx, event.ID, event.LeaseToken, query, args...)
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	return tx.Commit()
}

// MarkReadbackAbsent proves that a prior unknown mutation is not present in
// WLT's canonical read model, making a fresh idempotent delivery safe.
func MarkReadbackAbsent(db *sql.DB, event Event, cause error) error {
	if event.AttemptCount >= MaxDeliveryAttempts {
		return MarkDeliveryFailure(db, event, cause)
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	updated, err := markLeaseTransition(tx, event.ID, event.LeaseToken, `
		UPDATE dsh_checkout_financial_closure_outbox
		SET status='pending', failure_disposition='retry_scheduled', failure_classification='PROVEN_ABSENT', diagnostic_code='wlt_readback_absent',
		    last_error=$3, last_readback_at=NOW(), next_retry_at=NOW()+$4::interval,
		    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`,
		errorText(cause), intervalValue(backoff(event.AttemptCount+1)))
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	return tx.Commit()
}

func MarkInvalidOperatorContext(db *sql.DB, event Event, cause error) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	updated, err := markLeaseTransition(tx, event.ID, event.LeaseToken, `
		UPDATE dsh_checkout_financial_closure_outbox
		SET status='failed', failure_disposition='invalid_operator_context', failure_classification='INVALID_UNRECOVERABLE', diagnostic_code='invalid_operator_context',
		    last_error=$3, lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE id=$1::uuid AND lease_token=$2::uuid AND status='processing'`, errorText(cause))
	if err != nil {
		return err
	}
	if !updated {
		return nil
	}
	if event.EventType != EventTypeReleaseCodReservation {
		if err := updateFailedOrderProjection(tx, event.OrderID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// RetryFailed is the explicit operator restart transition for a definitive
// failure. Reconciliation-required failures must use RequeueForReconciliation
// so an unknown WLT result is read before any mutation is attempted.
func RetryFailed(db *sql.DB, id, reason string) error {
	return retryFailed(db, id, "", reason)
}

func RetryFailedForOperatorContext(db *sql.DB, id, operatorContextID, reason string) error {
	return retryFailed(db, id, strings.TrimSpace(operatorContextID), reason)
}

func retryFailed(db *sql.DB, id, operatorContextID, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return fmt.Errorf("manual retry reason is required")
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	var orderID, eventType string
	err = tx.QueryRow(`
		UPDATE dsh_checkout_financial_closure_outbox outbox
		SET status='pending', attempt_count=0, readback_attempt_count=0,
		    last_readback_at=NULL, next_retry_at=NOW(), last_error=$2,
		    failure_disposition='retry_scheduled', failure_classification='PROVEN_ABSENT', diagnostic_code='manual_retry_requested',
		    completed_at=NULL, result_action=NULL, result_reference=NULL,
		    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE outbox.id=$1::uuid AND outbox.status='failed'
		  AND outbox.failure_disposition NOT IN ('reconciliation_required','invalid_operator_context')
		  AND EXISTS (
			SELECT 1 FROM dsh_checkout_intents intent
			WHERE intent.id=outbox.checkout_intent_id
			  AND ($3='' OR btrim(intent.operator_context_id)=$3)
		  )
		RETURNING COALESCE(outbox.order_id::text,''), outbox.event_type`, id, reason, operatorContextID).Scan(&orderID, &eventType)
	if err == sql.ErrNoRows {
		return fmt.Errorf("checkout finance event is not eligible for manual retry")
	}
	if err != nil {
		return err
	}
	if eventType != EventTypeReleaseCodReservation {
		if err := updatePendingOrderProjection(tx, orderID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// RequeueForReconciliation is the explicit operator recovery transition for a
// terminal unknown result. It only schedules canonical readback; it never
// retries the WLT mutation directly.
func RequeueForReconciliation(db *sql.DB, id, reason string) error {
	return requeueForReconciliation(db, id, "", reason)
}

func RequeueForReconciliationForOperatorContext(db *sql.DB, id, operatorContextID, reason string) error {
	return requeueForReconciliation(db, id, strings.TrimSpace(operatorContextID), reason)
}

func requeueForReconciliation(db *sql.DB, id, operatorContextID, reason string) error {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return fmt.Errorf("reconciliation reason is required")
	}
	result, err := db.Exec(`
		UPDATE dsh_checkout_financial_closure_outbox outbox
		SET status='unknown', next_retry_at=NOW(), readback_attempt_count=0,
		    failure_disposition='reconciliation_required', failure_classification='UNKNOWN_REQUIRES_READBACK', diagnostic_code='manual_reconciliation_requested',
		    last_error=$2, lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
		WHERE outbox.id=$1::uuid AND outbox.status='failed'
		  AND outbox.failure_disposition='reconciliation_required'
		  AND EXISTS (
			SELECT 1 FROM dsh_checkout_intents intent
			WHERE intent.id=outbox.checkout_intent_id
			  AND ($3='' OR btrim(intent.operator_context_id)=$3)
		  )`, id, reason, operatorContextID)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count != 1 {
		return fmt.Errorf("checkout finance event is not eligible for reconciliation")
	}
	return nil
}
