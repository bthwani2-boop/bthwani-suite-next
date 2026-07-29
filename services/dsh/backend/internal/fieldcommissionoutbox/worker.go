package fieldcommissionoutbox

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"dsh-api/internal/wlt"
)

const (
	batchSize     = 20
	claimLease    = 2 * time.Minute
	notifyTimeout = 10 * time.Second
)

func RunWorker(ctx context.Context, db *sql.DB, client *wlt.Client, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db, client); err != nil {
				log.Printf("[field-commission-outbox] batch processing error: %v", err)
			}
		}
	}
}

func ProcessOnce(ctx context.Context, db *sql.DB, client *wlt.Client) error {
	events, err := ClaimBatch(db, batchSize, claimLease)
	if err != nil {
		return err
	}
	for _, event := range events {
		if event.OperatorContextID == "" {
			err := fmt.Errorf("field commission event %s has no tenant context", event.ID)
			if markErr := MarkFailed(db, event.ID, event.AttemptCount, err); markErr != nil {
				log.Printf("[field-commission-outbox] failed to record missing tenant for event %s: %v", event.ID, markErr)
			}
			continue
		}
		notifyCtx, cancel := context.WithTimeout(wlt.WithOperatorContext(ctx, event.OperatorContextID), notifyTimeout)
		err := client.DeliverFieldCategoryCommission(notifyCtx, wlt.DeliverFieldCategoryCommissionInput{
			BeneficiaryActorID: event.FieldActorID,
			VisitID:            event.VisitID,
			StoreID:            event.StoreID,
			PartnerID:          event.PartnerID,
			PartnerCategory:    event.PartnerCategory,
			IdempotencyKey:     event.IdempotencyKey,
			CorrelationID:      event.CorrelationID,
		})
		cancel()
		if err != nil {
			log.Printf("[field-commission-outbox] delivery failed for tenant %s visit %s category %s (attempt %d): %v", event.OperatorContextID, event.VisitID, event.PartnerCategory, event.AttemptCount+1, err)
			if markErr := MarkFailed(db, event.ID, event.AttemptCount, err); markErr != nil {
				log.Printf("[field-commission-outbox] failed to record retry state for event %s: %v", event.ID, markErr)
			}
			continue
		}
		if markErr := MarkSent(db, event.ID); markErr != nil {
			log.Printf("[field-commission-outbox] failed to mark event %s sent after successful delivery: %v", event.ID, markErr)
		}
	}
	return nil
}
