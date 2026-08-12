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
		if event.Status == "unknown" {
			readbackCtx, readbackCancel := context.WithTimeout(ctx, notifyTimeout)
			readback, readbackErr := client.ReadbackOutboxEvent(readbackCtx, wlt.OutboxReadbackInput{
				EventType: event.EventType, OperatorContextID: event.OperatorContextID, OrderID: event.OrderID, CollectorType: event.CollectorType,
				CollectorID: event.CollectorID, PartnerID: event.PartnerID, ClientID: event.ClientID,
				CheckoutIntentID: event.CheckoutIntentID, Payload: event.Payload,
			})
			readbackCancel()
			if readbackErr == nil && readback.Present {
				if markErr := MarkSentWithReference(db, event.ID, readback.Reference); markErr != nil {
					log.Printf("[wlt-outbox] mark readback-proven event sent failed for %s: %v", event.ID, markErr)
				}
				continue
			}
			if readbackErr == nil && readback.Absent {
				if markErr := MarkFailed(db, event.ID, event.AttemptCount, fmt.Errorf("canonical WLT readback proved event absent")); markErr != nil {
					log.Printf("[wlt-outbox] retry state failed after absent readback for %s: %v", event.ID, markErr)
				}
				continue
			}
			if markErr := MarkUnknown(db, event.ID, event.AttemptCount, readbackErr); markErr != nil {
				log.Printf("[wlt-outbox] unknown-result readback state failed for %s: %v", event.ID, markErr)
			}
			continue
		}
		notifyCtx, cancel := context.WithTimeout(ctx, notifyTimeout)
		externalReference, deliverErr := deliverEvent(notifyCtx, client, event)
		cancel()
		if deliverErr != nil {
			log.Printf("[wlt-outbox] event %s/%s failed (attempt %d): %v", event.ID, event.EventType, event.AttemptCount+1, deliverErr)
			if markErr := MarkUnknown(db, event.ID, event.AttemptCount, deliverErr); markErr != nil {
				log.Printf("[wlt-outbox] unknown-result state failed for %s: %v", event.ID, markErr)
			}
			continue
		}
		if markErr := MarkSentWithReference(db, event.ID, externalReference); markErr != nil {
			log.Printf("[wlt-outbox] mark sent failed for %s: %v", event.ID, markErr)
		}
	}
	return nil
}

func deliverEvent(ctx context.Context, client *wlt.Client, event Event) (string, error) {
	if event.OperatorContextID == "" {
		return "", fmt.Errorf("WLT outbox event %s has no OperatorContext context", event.ID)
	}
	ctx = wlt.WithOperatorContext(ctx, event.OperatorContextID)

	switch event.EventType {
	case EventTypeDeliveryCompleted:
		collectorType := event.CollectorType
		collectorID := event.CollectorID
		if collectorType == "" && event.CaptainID != "" {
			collectorType = CollectorCaptain
			collectorID = event.CaptainID
		}
		if err := client.NotifyDeliveryCollection(ctx, wlt.NotifyDeliveryCollectionInput{
			OrderID:          event.OrderID,
			CollectorType:    collectorType,
			CollectorID:      collectorID,
			PartnerID:        event.PartnerID,
			CheckoutIntentID: event.CheckoutIntentID,
		}); err != nil {
			return "", err
		}
		if event.CaptainID != "" {
			if err := client.DeliverCaptainCommission(ctx, wlt.DeliverCaptainCommissionInput{
				CaptainID:        event.CaptainID,
				OrderID:          event.OrderID,
				CheckoutIntentID: event.CheckoutIntentID,
			}); err != nil {
				return "", err
			}
		}
		return "", nil
	case EventTypeLoyaltyEarned:
		if event.ClientID == "" || event.Points <= 0 {
			return "", fmt.Errorf("invalid loyalty-earned payload")
		}
		entry, err := client.AppendLoyaltyEntry(ctx, wlt.AppendLoyaltyEntryInput{ClientID: event.ClientID, Direction: "earn", Points: event.Points, SourceType: "order", SourceID: event.OrderID, IdempotencyKey: "order:" + event.OrderID + ":loyalty:earn", CorrelationID: "dsh-order-" + event.OrderID, Metadata: event.Payload})
		if err != nil {
			return "", err
		}
		return entry.ID, nil
	case EventTypeLoyaltyReversed:
		if event.ClientID == "" || event.Points <= 0 || event.ReversalOfReference == "" {
			return "", fmt.Errorf("invalid loyalty-reversal payload")
		}
		entry, err := client.AppendLoyaltyEntry(ctx, wlt.AppendLoyaltyEntryInput{ClientID: event.ClientID, Direction: "reverse", Points: event.Points, SourceType: "order_refund", SourceID: event.OrderID, ReversalOf: event.ReversalOfReference, IdempotencyKey: "order:" + event.OrderID + ":loyalty:reverse", CorrelationID: "dsh-order-refund-" + event.OrderID, Metadata: event.Payload})
		if err != nil {
			return "", err
		}
		return entry.ID, nil
	case EventTypePromotionFundingCommit, EventTypePromotionFundingRelease, EventTypePromotionFundingReverse:
		reservationID, ok := event.Payload["fundingReservationId"].(string)
		if !ok || reservationID == "" {
			return "", fmt.Errorf("promotion funding event lacks reservation id")
		}
		redemptionID, _ := event.Payload["couponRedemptionId"].(string)
		reason, _ := event.Payload["reason"].(string)
		orderID, _ := event.Payload["orderId"].(string)
		transition := map[string]string{EventTypePromotionFundingCommit: "commit", EventTypePromotionFundingRelease: "release", EventTypePromotionFundingReverse: "reverse"}[event.EventType]
		result, err := client.TransitionPromotionFundingFromOutbox(ctx, reservationID, transition, wlt.PromotionFundingOutboxInput{OperatorContextID: event.OperatorContextID, OrderID: orderID, Reason: reason, IdempotencyKey: "coupon-redemption:" + redemptionID + ":funding:" + transition, CorrelationID: "dsh-promotion-funding-" + redemptionID})
		if err != nil {
			return "", err
		}
		return result.ID, nil
	case EventTypeOrderReturnApproved:
		returnID, ok := event.Payload["returnId"].(string)
		if !ok || returnID == "" {
			return "", fmt.Errorf("return event lacks returnId")
		}
		amountMinorUnits, _ := event.Payload["amountMinorUnits"].(float64)
		reason, _ := event.Payload["reason"].(string)

		// This sends the refund request to WLT
		refund, err := client.RefundFromOutbox(ctx, wlt.RefundOutboxInput{
			OperatorContextID: event.OperatorContextID,
			OrderID:           event.OrderID,
			ReturnID:          returnID,
			AmountMinorUnits:  int64(amountMinorUnits),
			Reason:            reason,
			IdempotencyKey:    "order:" + event.OrderID + ":return:" + returnID + ":refund",
			CorrelationID:     "dsh-return-refund-" + returnID,
		})
		if err != nil {
			return "", err
		}
		return refund.ID, nil
	default:
		return "", fmt.Errorf("unsupported WLT outbox event type %q", event.EventType)
	}
}
