package dshoutbox

import (
	"context"
	"database/sql"
	"log"
	"time"

	"wlt-api/internal/dshnotify"
)

const (
	batchSize     = 20
	claimLease    = 2 * time.Minute
	notifyTimeout = 10 * time.Second
)

func RunWorker(ctx context.Context, db *sql.DB, client *dshnotify.Client, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db, client); err != nil {
				log.Printf("[dsh-outbox] batch processing error: %v", err)
			}
		}
	}
}

func ProcessOnce(ctx context.Context, db *sql.DB, client *dshnotify.Client) error {
	events, err := ClaimBatch(db, batchSize, claimLease)
	if err != nil {
		return err
	}
	for _, e := range events {
		notifyCtx, cancel := context.WithTimeout(ctx, notifyTimeout)
		err := client.NotifyEvent(notifyCtx, dshnotify.Event{
			EventID: e.ID, CorrelationID: e.CorrelationID, TenantID: e.TenantID,
			CheckoutIntentID: e.CheckoutIntentID, SpecialRequestID: e.SpecialRequestID,
			PaymentSessionID: e.PaymentSessionID, Status: e.EventType,
			OrderID: e.OrderID, RefundReference: e.RefundReference, Reason: e.Reason,
		})
		cancel()
		if err != nil {
			log.Printf("[dsh-outbox] WLT event notify failed for session %s refund %s (attempt %d): %v", e.PaymentSessionID, e.RefundReference, e.AttemptCount+1, err)
			if markErr := MarkFailed(db, e.ID, e.AttemptCount, err); markErr != nil {
				log.Printf("[dsh-outbox] failed to record retry state for event %s: %v", e.ID, markErr)
			}
			continue
		}
		if markErr := MarkSent(db, e.ID); markErr != nil {
			log.Printf("[dsh-outbox] failed to mark event %s sent after successful notify: %v", e.ID, markErr)
		}
	}
	return nil
}
