package checkoutfinanceoutbox

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
				log.Printf("[checkout-finance-outbox] batch processing error: %v", err)
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
		deliverCtx, cancel := context.WithTimeout(ctx, notifyTimeout)
		result, deliverErr := dispatch(deliverCtx, client, event)
		cancel()
		if deliverErr != nil {
			log.Printf(
				"[checkout-finance-outbox] delivery failed for payment session %s event %s (attempt %d): %v",
				event.PaymentSessionID,
				event.EventType,
				event.AttemptCount+1,
				deliverErr,
			)
			if markErr := MarkFailedWithProjection(db, event.ID, event.AttemptCount, deliverErr); markErr != nil {
				log.Printf("[checkout-finance-outbox] failed to record retry state for event %s: %v", event.ID, markErr)
			}
			continue
		}
		if markErr := MarkSentWithResult(db, event.ID, result); markErr != nil {
			log.Printf("[checkout-finance-outbox] failed to project successful event %s: %v", event.ID, markErr)
		}
	}
	return nil
}

func dispatch(ctx context.Context, client *wlt.Client, event Event) (DeliveryResult, error) {
	switch event.EventType {
	case EventTypeExpireSession:
		if err := client.ExpireSession(ctx, event.PaymentSessionID, event.CheckoutIntentID); err != nil {
			return DeliveryResult{}, err
		}
		return DeliveryResult{
			Action:           "expired",
			PaymentSessionID: event.PaymentSessionID,
		}, nil
	case EventTypeCancelForOrder:
		result, err := client.CancelSessionForOrderWithResult(ctx, event.PaymentSessionID, wlt.CancelSessionForOrderInput{
			OrderID:       event.OrderID,
			ClientID:      event.ClientID,
			Reason:        event.Reason,
			CorrelationID: "order-cancellation-" + event.OrderID,
		})
		if err != nil {
			return DeliveryResult{}, err
		}
		if result == nil {
			return DeliveryResult{}, fmt.Errorf("WLT cancel-for-order returned no result")
		}
		return DeliveryResult{
			Action:           result.Action,
			SessionStatus:    result.SessionStatus,
			RefundID:         result.RefundID,
			PaymentSessionID: result.PaymentSessionID,
		}, nil
	default:
		return DeliveryResult{}, fmt.Errorf("unknown checkout finance outbox event type %q", event.EventType)
	}
}
