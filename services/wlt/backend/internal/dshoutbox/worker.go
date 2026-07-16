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

// RunWorker polls for pending DSH outbox events until ctx is cancelled. It is
// meant to run as a single background goroutine per wlt-api process; ClaimBatch's
// row-level locking makes it safe to run more than one instance concurrently
// too, but a single poller is enough at current volume.
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

// ProcessOnce claims and attempts delivery of one batch of pending events.
func ProcessOnce(ctx context.Context, db *sql.DB, client *dshnotify.Client) error {
	events, err := ClaimBatch(db, batchSize, claimLease)
	if err != nil {
		return err
	}
	for _, e := range events {
		notifyCtx, cancel := context.WithTimeout(ctx, notifyTimeout)
		err := client.Notify(notifyCtx, e.CheckoutIntentID, e.SpecialRequestID, e.PaymentSessionID, e.EventType)
		cancel()
		if err != nil {
			log.Printf("[dsh-outbox] payment-session event notify failed for session %s (attempt %d): %v", e.PaymentSessionID, e.AttemptCount+1, err)
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
