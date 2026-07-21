package orders

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"dsh-api/internal/wlt"
)

const paymentProjectionBatchSize = 50

type paymentProjectionWork struct {
	OrderID       string
	TenantID      string
	SessionID     string
	AttemptCount  int
}

func RunPaymentProjectionWorker(ctx context.Context, db *sql.DB, wltClient *wlt.Client, interval time.Duration) {
	if wltClient == nil || !wltClient.Configured() {
		return
	}
	if interval <= 0 {
		interval = 15 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	if err := ProcessPaymentProjectionOnce(ctx, db, wltClient); err != nil {
		log.Printf("[order-payment-projection] startup batch failed: %v", err)
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessPaymentProjectionOnce(ctx, db, wltClient); err != nil {
				log.Printf("[order-payment-projection] batch failed: %v", err)
			}
		}
	}
}

func ProcessPaymentProjectionOnce(ctx context.Context, db *sql.DB, wltClient *wlt.Client) error {
	work, err := claimPaymentProjectionWork(ctx, db, paymentProjectionBatchSize)
	if err != nil {
		return err
	}
	for _, item := range work {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		session, readErr := wltClient.GetPaymentSession(ctx, item.SessionID)
		if readErr != nil {
			if markErr := markPaymentProjectionFailure(ctx, db, item, readErr); markErr != nil {
				log.Printf("[order-payment-projection] failed to persist retry for order %s: %v", item.OrderID, markErr)
			}
			continue
		}
		if session.ID != item.SessionID {
			if markErr := markPaymentProjectionFailure(ctx, db, item, errors.New("WLT session id mismatch")); markErr != nil {
				log.Printf("[order-payment-projection] failed to persist session mismatch for order %s: %v", item.OrderID, markErr)
			}
			continue
		}
		if err := applyPaymentProjection(ctx, db, item, session); err != nil {
			if markErr := markPaymentProjectionFailure(ctx, db, item, err); markErr != nil {
				log.Printf("[order-payment-projection] failed to persist apply retry for order %s: %v", item.OrderID, markErr)
			}
		}
	}
	return nil
}

func claimPaymentProjectionWork(ctx context.Context, db *sql.DB, limit int) ([]paymentProjectionWork, error) {
	if limit <= 0 || limit > 200 {
		limit = paymentProjectionBatchSize
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(ctx, `
		WITH due AS (
			SELECT order_id
			FROM dsh_order_payment_projection_reconciliation
			WHERE (
			  status IN ('pending','retry','scheduled') AND next_attempt_at <= NOW()
			) OR (
			  status='processing' AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
			)
			ORDER BY next_attempt_at, order_id
			FOR UPDATE SKIP LOCKED
			LIMIT $1
		)
		UPDATE dsh_order_payment_projection_reconciliation r
		SET status='processing',
		    attempt_count=r.attempt_count+1,
		    lease_expires_at=NOW()+INTERVAL '2 minutes',
		    updated_at=NOW()
		FROM due
		WHERE r.order_id=due.order_id
		RETURNING r.order_id::text,r.tenant_id,r.wlt_payment_session_id,r.attempt_count`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]paymentProjectionWork, 0)
	for rows.Next() {
		var item paymentProjectionWork
		if err = rows.Scan(&item.OrderID, &item.TenantID, &item.SessionID, &item.AttemptCount); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return result, nil
}

func applyPaymentProjection(ctx context.Context, db *sql.DB, item paymentProjectionWork, session *wlt.PaymentSessionDetail) error {
	projection, err := mapWltPaymentProjection(session.Method, session.Status)
	if err != nil {
		return err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var currentProjection, currentOrderStatus, correlationID string
	var currentVersion int
	var currentSourceUpdated sql.NullTime
	err = tx.QueryRowContext(ctx, `
		SELECT payment_status_projection,status,correlation_id,version,payment_projection_source_updated_at
		FROM dsh_orders
		WHERE id=$1::uuid AND tenant_id=$2 AND wlt_payment_ref_id=$3
		FOR UPDATE`, item.OrderID, item.TenantID, item.SessionID,
	).Scan(&currentProjection, &currentOrderStatus, &correlationID, &currentVersion, &currentSourceUpdated)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	// Ignore an older WLT snapshot. It may arrive after a timeout/retry and must
	// never regress a projection that was already reconciled from a newer fact.
	isNewerSource := !currentSourceUpdated.Valid || session.UpdatedAt.After(currentSourceUpdated.Time)
	projectionChanged := currentProjection != projection
	newVersion := currentVersion
	if isNewerSource && projectionChanged {
		err = tx.QueryRowContext(ctx, `
			UPDATE dsh_orders
			SET payment_status_projection=$1,
			    payment_projection_updated_at=$2,
			    payment_projection_source_updated_at=$2,
			    payment_projection_reconciled_at=NOW(),
			    version=version+1,
			    updated_at=NOW()
			WHERE id=$3::uuid AND tenant_id=$4 AND wlt_payment_ref_id=$5
			RETURNING version`, projection, session.UpdatedAt, item.OrderID, item.TenantID, item.SessionID,
		).Scan(&newVersion)
		if err != nil {
			return err
		}
		metadata := fmt.Sprintf(`{"source":"WLT","paymentProjection":%q,"wltStatus":%q}`, projection, session.Status)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO dsh_order_status_events
			(order_id,tenant_id,actor_role,actor_id,from_status,to_status,note,event_type,
			 correlation_id,causation_id,order_version,metadata)
			VALUES ($1::uuid,$2,'system','wlt',$3,$3,'verified WLT projection changed',
			        'order.payment_projection_updated',$4,$5,$6,$7::jsonb)`,
			item.OrderID,
			item.TenantID,
			currentOrderStatus,
			correlationID,
			item.SessionID+":"+session.UpdatedAt.UTC().Format(time.RFC3339Nano),
			newVersion,
			metadata,
		)
		if err != nil {
			return err
		}
	} else {
		_, err = tx.ExecContext(ctx, `
			UPDATE dsh_orders
			SET payment_projection_reconciled_at=NOW(),
			    payment_projection_source_updated_at=CASE
			      WHEN payment_projection_source_updated_at IS NULL OR payment_projection_source_updated_at < $1
			      THEN $1 ELSE payment_projection_source_updated_at END
			WHERE id=$2::uuid AND tenant_id=$3 AND wlt_payment_ref_id=$4`,
			session.UpdatedAt, item.OrderID, item.TenantID, item.SessionID,
		)
		if err != nil {
			return err
		}
	}

	nextAttempt := nextPaymentProjectionAttempt(session.Status)
	_, err = tx.ExecContext(ctx, `
		UPDATE dsh_order_payment_projection_reconciliation
		SET status='scheduled',
		    attempt_count=0,
		    next_attempt_at=NOW()+($1 * INTERVAL '1 second'),
		    lease_expires_at=NULL,
		    last_source_status=$2,
		    last_source_updated_at=$3,
		    last_error='',
		    updated_at=NOW()
		WHERE order_id=$4::uuid AND tenant_id=$5 AND wlt_payment_session_id=$6`,
		int64(nextAttempt/time.Second), session.Status, session.UpdatedAt, item.OrderID, item.TenantID, item.SessionID,
	)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func markPaymentProjectionFailure(ctx context.Context, db *sql.DB, item paymentProjectionWork, failure error) error {
	attempt := item.AttemptCount
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 10 {
		attempt = 10
	}
	retryAfter := time.Duration(1<<uint(attempt)) * time.Second
	if retryAfter < time.Minute {
		retryAfter = time.Minute
	}
	status := "retry"
	if item.AttemptCount >= 12 {
		status = "paused"
		retryAfter = 24 * time.Hour
	}
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_order_payment_projection_reconciliation
		SET status=$1,
		    next_attempt_at=NOW()+($2 * INTERVAL '1 second'),
		    lease_expires_at=NULL,
		    last_error=LEFT($3,1000),
		    updated_at=NOW()
		WHERE order_id=$4::uuid AND tenant_id=$5 AND wlt_payment_session_id=$6`,
		status,
		int64(retryAfter/time.Second),
		failure.Error(),
		item.OrderID,
		item.TenantID,
		item.SessionID,
	)
	return err
}

func mapWltPaymentProjection(method, status string) (string, error) {
	method = strings.TrimSpace(strings.ToLower(method))
	status = strings.TrimSpace(strings.ToLower(status))
	switch status {
	case "initiated", "reference_created":
		if method == "cod" {
			return "cash_due", nil
		}
		return "pending", nil
	case "captured":
		return "confirmed", nil
	case "refunded":
		return "refunded", nil
	case "failed":
		return "failed", nil
	case "cancelled":
		return "cancelled", nil
	case "expired":
		return "expired", nil
	default:
		return "", fmt.Errorf("unsupported WLT payment status %q", status)
	}
}

func nextPaymentProjectionAttempt(status string) time.Duration {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case "initiated", "reference_created":
		return 30 * time.Second
	case "captured":
		// A captured session can later become refunded.
		return 5 * time.Minute
	case "refunded", "failed", "cancelled", "expired":
		return 30 * time.Minute
	default:
		return 5 * time.Minute
	}
}
