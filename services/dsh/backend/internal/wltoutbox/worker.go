package wltoutbox

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
				log.Printf("[wlt-outbox] batch processing error: %v", err)
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
		notifyCtx, cancel := context.WithTimeout(ctx, notifyTimeout)
		externalReference, deliverErr := deliverEvent(notifyCtx, client, event)
		cancel()
		if deliverErr != nil {
			log.Printf("[wlt-outbox] event %s/%s failed for order %s (attempt %d): %v", event.ID, event.EventType, event.OrderID, event.AttemptCount+1, deliverErr)
			if markErr := MarkFailed(db, event.ID, event.AttemptCount, deliverErr); markErr != nil {
				log.Printf("[wlt-outbox] failed to record retry state for event %s: %v", event.ID, markErr)
			}
			continue
		}
		if markErr := MarkSentWithReference(db, event.ID, externalReference); markErr != nil {
			log.Printf("[wlt-outbox] failed to mark event %s sent: %v", event.ID, markErr)
		}
	}
	return nil
}

func deliverEvent(ctx context.Context, client *wlt.Client, event Event) (string, error) {
	switch event.EventType {
	case EventTypeDeliveryCompleted:
		err := client.NotifyDeliveryCompleted(ctx, wlt.NotifyDeliveryCompletedInput{
			OrderID:          event.OrderID,
			CaptainID:        event.CaptainID,
			PartnerID:        event.PartnerID,
			CheckoutIntentID: event.CheckoutIntentID,
		})
		return "", err
	case EventTypeLoyaltyEarned:
		if event.ClientID == "" || event.Points <= 0 {
			return "", fmt.Errorf("invalid loyalty-earned outbox payload")
		}
		entry, err := client.AppendLoyaltyEntry(ctx, wlt.AppendLoyaltyEntryInput{
			ClientID:       event.ClientID,
			Direction:      "earn",
			Points:         event.Points,
			SourceType:     "order",
			SourceID:       event.OrderID,
			IdempotencyKey: "order:" + event.OrderID + ":loyalty:earn",
			CorrelationID:  "dsh-order-" + event.OrderID,
			Metadata:       event.Payload,
		})
		if err != nil {
			return "", err
		}
		return entry.ID, nil
	case EventTypeLoyaltyReversed:
		if event.ClientID == "" || event.Points <= 0 || event.ReversalOfReference == "" {
			return "", fmt.Errorf("invalid loyalty-reversal outbox payload")
		}
		entry, err := client.AppendLoyaltyEntry(ctx, wlt.AppendLoyaltyEntryInput{
			ClientID:       event.ClientID,
			Direction:      "reverse",
			Points:         event.Points,
			SourceType:     "order_refund",
			SourceID:       event.OrderID,
			ReversalOf:     event.ReversalOfReference,
			IdempotencyKey: "order:" + event.OrderID + ":loyalty:reverse",
			CorrelationID:  "dsh-order-refund-" + event.OrderID,
			Metadata:       event.Payload,
		})
		if err != nil {
			return "", err
		}
		return entry.ID, nil
	default:
		return "", fmt.Errorf("unsupported WLT outbox event type %q", event.EventType)
	}
}
