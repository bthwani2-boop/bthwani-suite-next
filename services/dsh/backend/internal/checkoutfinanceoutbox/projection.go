package checkoutfinanceoutbox

import (
	"database/sql"
	"fmt"
	"strings"
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
		reference = result.SessionStatus
	default:
		return "", "", fmt.Errorf("unsupported financial closure action %q", result.Action)
	}
	return status, strings.TrimSpace(reference), nil
}

// MarkSentWithResult atomically closes the outbox event and projects WLT's
// financial decision onto both the order and its cancellation record.
func MarkSentWithResult(db *sql.DB, id string, result DeliveryResult) error {
	status, reference, err := financialProjection(result)
	if err != nil {
		return err
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var orderID sql.NullString
	if err := tx.QueryRow(`
		UPDATE dsh_checkout_financial_closure_outbox
		SET status='sent',
		    result_action=$2,
		    result_reference=NULLIF($3,''),
		    completed_at=NOW(),
		    last_error=NULL,
		    updated_at=NOW()
		WHERE id=$1::uuid AND status IN ('pending','failed')
		RETURNING order_id::text`, id, result.Action, reference).Scan(&orderID); err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}
	if orderID.Valid && orderID.String != "" {
		if _, err := tx.Exec(`
			UPDATE dsh_orders
			SET financial_closure_status=$2,
			    financial_closure_reference=NULLIF($3,''),
			    updated_at=NOW()
			WHERE id=$1::uuid`, orderID.String, status, reference); err != nil {
			return err
		}
		if _, err := tx.Exec(`
			UPDATE dsh_order_cancellations
			SET financial_closure_status=$2,
			    financial_reference=NULLIF($3,''),
			    updated_at=NOW()
			WHERE order_id=$1::uuid`, orderID.String, status, reference); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// MarkFailedWithProjection retains the retryable event but surfaces persistent
// financial closure failures to operations after three failed deliveries.
func MarkFailedWithProjection(db *sql.DB, id string, attemptCount int, cause error) error {
	if err := MarkFailed(db, id, attemptCount, cause); err != nil {
		return err
	}
	if attemptCount+1 < 3 {
		return nil
	}
	_, err := db.Exec(`
		WITH target AS (
			SELECT order_id
			FROM dsh_checkout_financial_closure_outbox
			WHERE id=$1::uuid AND order_id IS NOT NULL
		)
		UPDATE dsh_orders o
		SET financial_closure_status='failed', updated_at=NOW()
		FROM target
		WHERE o.id=target.order_id`, id)
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		WITH target AS (
			SELECT order_id
			FROM dsh_checkout_financial_closure_outbox
			WHERE id=$1::uuid AND order_id IS NOT NULL
		)
		UPDATE dsh_order_cancellations c
		SET financial_closure_status='failed', updated_at=NOW()
		FROM target
		WHERE c.order_id=target.order_id`, id)
	return err
}
