package wltoutbox

import (
	"context"
	"database/sql"
	"log"
	"time"

	"dsh-api/internal/wlt"
)

const (
	batchSize     = 20
	claimLease    = 2 * time.Minute
	notifyTimeout = 10 * time.Second
)

// RunWorker polls for pending WLT outbox events until ctx is cancelled. It is
// meant to run as a single background goroutine per dsh-api process; ClaimBatch's
// row-level locking makes it safe to run more than one instance concurrently
// too, but a single poller is enough at current volume.
func RunWorker(ctx context.Context, db *sql.DB, client *wlt.Client, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db, client); err != nil {
				log.Printf("[wlt-outbox] batch processing error: %v", err)
			}
		}
	}
}

// ProcessOnce claims and attempts delivery of one batch of pending events.
func ProcessOnce(ctx context.Context, db *sql.DB, client *wlt.Client) error {
	events, err := ClaimBatch(db, batchSize, claimLease)
	if err != nil {
		return err
	}
	for _, e := range events {
		notifyCtx, cancel := context.WithTimeout(ctx, notifyTimeout)
		err := client.NotifyDeliveryCompleted(notifyCtx, wlt.NotifyDeliveryCompletedInput{
			OrderID:          e.OrderID,
			CaptainID:        e.CaptainID,
			PartnerID:        e.PartnerID,
			CheckoutIntentID: e.CheckoutIntentID,
		})
		cancel()
		if err != nil {
			log.Printf("[wlt-outbox] delivery-completed notify failed for order %s (attempt %d): %v", e.OrderID, e.AttemptCount+1, err)
			if markErr := MarkFailed(db, e.ID, e.AttemptCount, err); markErr != nil {
				log.Printf("[wlt-outbox] failed to record retry state for event %s: %v", e.ID, markErr)
			}
			continue
		}
		if markErr := MarkSent(db, e.ID); markErr != nil {
			log.Printf("[wlt-outbox] failed to mark event %s sent after successful notify: %v", e.ID, markErr)
		}
	}
	return nil
}
