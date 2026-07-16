package specialrequests

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ErrPaymentSessionMismatch indicates a WLT payment event referenced a
// paymentSessionId that does not match the session attached to the special
// request. Mirrors checkout.ErrPaymentSessionMismatch.
var ErrPaymentSessionMismatch = errors.New("wlt payment session id does not match special request")

// AttachWltPaymentSession stamps a WLT payment session id onto a special
// request once a quote has been set and approval is being requested. Unlike
// checkout.AttachWltPaymentSession, this does not move status: special
// requests have no payment_pending status in their 9-value enum, so status
// intentionally stays put here until WLT reports a terminal outcome via
// ApplyWltPaymentEvent.
func (s *Service) AttachWltPaymentSession(ctx context.Context, id string, expectedVersion int, sessionID string) (*SpecialRequest, error) {
	if id == "" || sessionID == "" {
		return nil, fmt.Errorf("%w: id and sessionID are required", ErrInvalid)
	}
	current, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if !moneyEditableStatuses[current.Status] {
		return nil, fmt.Errorf("%w: cannot attach payment session from status %s", ErrConflict, current.Status)
	}
	if current.EstimatedAmountMinorUnits == nil || current.Currency == nil {
		return nil, fmt.Errorf("%w: quote must be set before approval", ErrInvalid)
	}
	return s.repo.Update(ctx, id, expectedVersion, UpdateInput{WltPaymentSessionID: &sessionID})
}

// ApplyWltPaymentEvent advances a special request in response to a terminal
// WLT payment-session outcome reported by the WLT service-to-service webhook.
// It is a free function, not a Service method, mirroring the style of
// checkout.ApplyWltPaymentEvent: the webhook handler has no client actor
// context, only the raw db handle and the ids from WLT's payload.
//
// It calls repo.Get then repo.Update without a transaction: repo.Update's own
// WHERE id = $1 AND version = $2 optimistic check already prevents a lost
// update if the request is mutated concurrently (the caller — WLT's outbox
// retrier — gets ErrVersionConflict, which the HTTP layer maps to 409 and
// retries), so wrapping this in a transaction with a row lock (as
// TransitionDispatchStatus does for dispatch-triggered writes) would add
// nothing here.
//
// It is idempotent: replays of an event that no longer needs to change
// anything (already approved, or moved on operationally since) are a no-op
// success.
func ApplyWltPaymentEvent(db *sql.DB, id, paymentSessionID, wltStatus string) (*SpecialRequest, error) {
	if id == "" || paymentSessionID == "" || wltStatus == "" {
		return nil, fmt.Errorf("%w: id, paymentSessionId and status are required", ErrInvalid)
	}

	ctx := context.Background()
	repo := NewPostgresRepository(db)

	current, err := repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.WltPaymentSessionID == nil || *current.WltPaymentSessionID != paymentSessionID {
		return nil, ErrPaymentSessionMismatch
	}

	switch wltStatus {
	case "captured", "cod_collected":
		if !moneyEditableStatuses[current.Status] {
			// Already approved, or the request has moved on operationally
			// (assigned/in_progress/completed) since the quote was approved:
			// a late or retried payment confirmation must never fight with
			// operational progress already made.
			return current, nil
		}
		status := StatusApproved
		return repo.Update(ctx, id, current.Version, UpdateInput{Status: &status})
	case "failed", "expired":
		// Conservative: do not auto-cancel the special request. The client
		// or operator can retry approve-quote later.
		return current, nil
	case "authorized", "reference_created", "cod_pending":
		// Intermediate WLT states are not yet a terminal outcome.
		return current, nil
	default:
		return nil, fmt.Errorf("%w: unsupported wltStatus %q", ErrInvalid, wltStatus)
	}
}
