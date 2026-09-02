package checkoutfinanceoutbox

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

const (
	batchSize     = 20
	claimLease    = 2 * time.Minute
	notifyTimeout = 10 * time.Second
)

var errCanonicalEffectAbsent = errors.New("canonical WLT readback proves the closure effect is absent")

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
		if !validOperatorContextID(event.OperatorContextID) {
			missing := fmt.Errorf("checkout finance event %s has no valid OperatorContext context", event.ID)
			if markErr := MarkInvalidOperatorContext(db, event, missing); markErr != nil {
				log.Printf("[checkout-finance-outbox] failed to record invalid OperatorContext for event %s: %v", event.ID, markErr)
			}
			continue
		}

		deliverCtx, cancel := context.WithTimeout(wlt.WithOperatorContext(ctx, event.OperatorContextID), notifyTimeout)
		var result DeliveryResult
		var deliverErr error
		if event.Status == "unknown" {
			var retry bool
			result, retry, deliverErr = reconcileUnknown(deliverCtx, client, event)
			if retry && errors.Is(deliverErr, errCanonicalEffectAbsent) {
				cancel()
				if markErr := MarkReadbackAbsent(db, event, deliverErr); markErr != nil {
					log.Printf("[checkout-finance-outbox] failed to reschedule absent readback event %s: %v", event.ID, markErr)
				}
				continue
			}
		} else {
			result, deliverErr = dispatch(deliverCtx, client, event)
		}
		cancel()

		if deliverErr != nil {
			if event.Status == "unknown" || isOutcomeUnknown(deliverErr) {
				if markErr := MarkOutcomeUnknown(db, event, deliverErr); markErr != nil {
					log.Printf("[checkout-finance-outbox] failed to record unknown outcome for event %s: %v", event.ID, markErr)
				}
				continue
			}
			log.Printf(
				"[checkout-finance-outbox] delivery failed for OperatorContext %s payment session %s event %s (attempt %d): %v",
				event.OperatorContextID, event.PaymentSessionID, event.EventType, event.AttemptCount+1, deliverErr,
			)
			if markErr := MarkDeliveryFailure(db, event, deliverErr); markErr != nil {
				log.Printf("[checkout-finance-outbox] failed to record retry state for event %s: %v", event.ID, markErr)
			}
			continue
		}
		if markErr := MarkSentWithResult(db, event.ID, event.LeaseToken, result); markErr != nil {
			log.Printf("[checkout-finance-outbox] failed to project successful event %s: %v", event.ID, markErr)
		}
	}
	return nil
}

func isOutcomeUnknown(err error) bool {
	return wlt.IsMutationOutcomeUnknown(err) ||
		wlt.IsPaymentSessionOutcomeUnknown(err) ||
		wlt.IsCanonicalReadbackUnavailable(err) ||
		errors.Is(err, errCanonicalEffectAbsent)
}

func resultForPaymentSession(event Event, session *wlt.PaymentSession) (DeliveryResult, error) {
	if session == nil || strings.TrimSpace(session.ID) == "" {
		return DeliveryResult{}, fmt.Errorf("WLT payment-session readback is empty")
	}
	if session.Status == "provider_result_unknown" {
		return DeliveryResult{}, fmt.Errorf("%w: payment session remains provider_result_unknown", wlt.ErrPaymentSessionOutcomeUnknown)
	}
	switch event.EventType {
	case EventTypeExpireSession:
		switch session.Status {
		case "expired":
			return DeliveryResult{Action: "expired", PaymentSessionID: session.ID}, nil
		case "captured", "cod_finalized", "failed":
			return DeliveryResult{Action: "none", SessionStatus: session.Status, PaymentSessionID: session.ID}, nil
		default:
			return DeliveryResult{}, errCanonicalEffectAbsent
		}
	case EventTypeCancelForOrder:
		switch session.Status {
		case "expired":
			return DeliveryResult{Action: "expired", PaymentSessionID: session.ID}, nil
		case "failed":
			return DeliveryResult{Action: "none", SessionStatus: session.Status, PaymentSessionID: session.ID}, nil
		case "captured", "cod_finalized":
			return DeliveryResult{}, errCanonicalEffectAbsent
		default:
			return DeliveryResult{}, errCanonicalEffectAbsent
		}
	default:
		return DeliveryResult{}, fmt.Errorf("payment-session readback is not valid for event type %q", event.EventType)
	}
}

func reconcileUnknown(ctx context.Context, client *wlt.Client, event Event) (DeliveryResult, bool, error) {
	switch event.EventType {
	case EventTypeReleaseCodReservation:
		reservation, err := client.GetCodReservation(ctx, event.OrderID)
		if err != nil {
			return DeliveryResult{}, false, err
		}
		if reservation == nil {
			return DeliveryResult{Action: "none", SessionStatus: "absent", PaymentSessionID: event.PaymentSessionID}, false, nil
		}
		switch reservation.Status {
		case "released":
			return DeliveryResult{Action: "cod_reservation_released", PaymentSessionID: event.PaymentSessionID}, false, nil
		case "finalized":
			return DeliveryResult{Action: "none", SessionStatus: reservation.Status, PaymentSessionID: event.PaymentSessionID}, false, nil
		case "reserved":
			return DeliveryResult{}, true, errCanonicalEffectAbsent
		default:
			return DeliveryResult{}, false, fmt.Errorf("%w: unsupported COD reservation status %q", wlt.ErrCanonicalReadbackUnavailable, reservation.Status)
		}
	case EventTypeExpireSession, EventTypeCancelForOrder:
		session, err := client.GetPaymentSession(ctx, event.PaymentSessionID)
		if err != nil {
			return DeliveryResult{}, false, err
		}
		if event.EventType == EventTypeCancelForOrder && (session.Status == "captured" || session.Status == "cod_finalized") {
			refundID, refundErr := client.FindCancellationRefund(ctx, event.OrderID, event.PaymentSessionID)
			if refundErr != nil {
				return DeliveryResult{}, false, refundErr
			}
			if refundID != "" {
				return DeliveryResult{Action: "refund_requested", RefundID: refundID, PaymentSessionID: event.PaymentSessionID}, false, nil
			}
		}
		result, err := resultForPaymentSession(event, session)
		if errors.Is(err, errCanonicalEffectAbsent) {
			return DeliveryResult{}, true, err
		}
		return result, false, err
	default:
		return DeliveryResult{}, false, fmt.Errorf("unsupported checkout finance event type %q", event.EventType)
	}
}

func dispatch(ctx context.Context, client *wlt.Client, event Event) (DeliveryResult, error) {
	switch event.EventType {
	case EventTypeExpireSession:
		if err := client.ExpireSession(ctx, event.PaymentSessionID, event.CorrelationID); err != nil {
			return DeliveryResult{}, err
		}
		session, err := client.GetPaymentSession(ctx, event.PaymentSessionID)
		if err != nil {
			return DeliveryResult{}, err
		}
		return resultForPaymentSession(event, session)
	case EventTypeCancelForOrder:
		result, err := client.CancelSessionForOrderWithResult(ctx, event.PaymentSessionID, wlt.CancelSessionForOrderInput{
			OrderID: event.OrderID, ClientID: event.ClientID, Reason: event.Reason, CorrelationID: event.CorrelationID,
		})
		if err != nil {
			return DeliveryResult{}, err
		}
		if result == nil {
			return DeliveryResult{}, fmt.Errorf("WLT order-cancellation returned no result")
		}
		paymentSessionID := result.PaymentSessionID
		if paymentSessionID == "" {
			paymentSessionID = event.PaymentSessionID
		}
		return DeliveryResult{
			Action: result.Action, SessionStatus: result.SessionStatus,
			RefundID: result.RefundID, PaymentSessionID: paymentSessionID,
		}, nil
	case EventTypeReleaseCodReservation:
		if event.OrderID == "" {
			return DeliveryResult{}, fmt.Errorf("COD reservation release event has no order id")
		}
		reservation, err := client.ReleaseCodReservation(ctx, event.OrderID, event.Reason, event.CorrelationID)
		if err != nil {
			return DeliveryResult{}, err
		}
		if reservation == nil {
			return DeliveryResult{}, fmt.Errorf("WLT COD release returned no reservation")
		}
		if reservation.Status == "finalized" {
			return DeliveryResult{Action: "none", SessionStatus: reservation.Status, PaymentSessionID: event.PaymentSessionID}, nil
		}
		if reservation.Status != "released" {
			return DeliveryResult{}, fmt.Errorf("WLT COD release returned unsupported status %q", reservation.Status)
		}
		return DeliveryResult{Action: "cod_reservation_released", PaymentSessionID: event.PaymentSessionID}, nil
	default:
		return DeliveryResult{}, fmt.Errorf("unsupported checkout finance outbox event type %q", event.EventType)
	}
}
