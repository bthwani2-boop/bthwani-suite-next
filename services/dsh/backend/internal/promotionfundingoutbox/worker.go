package promotionfundingoutbox

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"dsh-api/internal/coupons"
	"dsh-api/internal/wlt"
)

const (
	batchSize     = 20
	claimLease    = 2 * time.Minute
	deliveryLimit = 10 * time.Second
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
				log.Printf("[promotion-funding-outbox] batch processing error: %v", err)
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
		deliverCtx, cancel := context.WithTimeout(ctx, deliveryLimit)
		targetStatus, deliveryErr := dispatch(deliverCtx, client, event)
		cancel()
		if deliveryErr == nil {
			deliveryErr = coupons.MarkFundingProjection(ctx, db, event.WLTReservationID, targetStatus)
		}
		if deliveryErr != nil {
			log.Printf("[promotion-funding-outbox] delivery failed reservation=%s type=%s attempt=%d: %v",
				event.WLTReservationID, event.EventType, event.AttemptCount+1, deliveryErr)
			if markErr := MarkFailed(db, event.ID, event.AttemptCount, deliveryErr); markErr != nil {
				log.Printf("[promotion-funding-outbox] failed to record retry state event=%s: %v", event.ID, markErr)
			}
			continue
		}
		if err := MarkSent(db, event.ID); err != nil {
			log.Printf("[promotion-funding-outbox] failed to mark event sent event=%s: %v", event.ID, err)
		}
	}
	return nil
}

func dispatch(ctx context.Context, client *wlt.Client, event Event) (string, error) {
	input := wlt.PromotionFundingTransitionInput{
		TenantID: event.TenantID,
		OrderID:  event.OrderID,
		Reason:   event.Reason,
	}
	switch event.EventType {
	case EventCommit:
		reservation, err := client.CommitPromotionFunding(
			ctx,
			event.WLTReservationID,
			input,
			event.IdempotencyKey,
			event.CorrelationID,
		)
		if err != nil {
			return "", err
		}
		if reservation.Status != "committed" {
			return "", fmt.Errorf("unexpected WLT funding status %s", reservation.Status)
		}
		return "committed", nil
	case EventRelease:
		reservation, err := client.ReleasePromotionFunding(
			ctx,
			event.WLTReservationID,
			input,
			event.IdempotencyKey,
			event.CorrelationID,
		)
		if err != nil {
			return "", err
		}
		if reservation.Status != "released" {
			return "", fmt.Errorf("unexpected WLT funding status %s", reservation.Status)
		}
		return "released", nil
	case EventReverse:
		reservation, err := client.ReversePromotionFunding(
			ctx,
			event.WLTReservationID,
			input,
			event.IdempotencyKey,
			event.CorrelationID,
		)
		if err != nil {
			return "", err
		}
		if reservation.Status != "reversed" {
			return "", fmt.Errorf("unexpected WLT funding status %s", reservation.Status)
		}
		return "reversed", nil
	default:
		return "", fmt.Errorf("unknown promotion funding event type %q", event.EventType)
	}
}
