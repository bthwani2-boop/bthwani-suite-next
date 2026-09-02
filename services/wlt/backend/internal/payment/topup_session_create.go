package payment

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/shared"
)

// ErrUnsupportedTopUpActorType is returned when CreateTopUpSessionInput.ActorType
// is not one of the two actor types a Cash-In wallet top-up may credit.
var ErrUnsupportedTopUpActorType = errors.New("topup actorType must be customer or captain")

// CreateTopUpSessionInput is the fourth payment-session creation shape
// (alongside checkout-intent/special-request/subscription-purchase): a
// Cash-In wallet top-up has no order or subscription behind it, only the
// actor being credited and the reference DSH already minted for it.
type CreateTopUpSessionInput struct {
	ActorType      string `json:"actorType"`
	ActorID        string `json:"actorId"`
	TopUpReference string `json:"topupReference"`
	// OperatorContextID is server-owned partition state. The HTTP transport
	// never accepts it from a caller; the trusted request context supplies it.
	OperatorContextID string `json:"-"`
	AmountMinorUnits  int64  `json:"amountMinorUnits"`
	Currency          string `json:"currency"`
	IdempotencyKey    string `json:"-"`
	CorrelationID     string `json:"-"`
}

type createTopUpSessionRequest struct {
	ActorType        string `json:"actorType"`
	ActorID          string `json:"actorId"`
	TopUpReference   string `json:"topupReference"`
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
}

// CreateTopUpSession derives the topup purpose from ActorType and delegates
// to CreatePaymentSession so top-up sessions share exactly one write path,
// one idempotent-replay/allocation-conservation machinery, and one read
// surface with every other payment session source.
func CreateTopUpSession(db *sql.DB, input CreateTopUpSessionInput) (*PaymentSession, error) {
	switch input.ActorType {
	case "customer", "captain":
	default:
		return nil, fmt.Errorf("%w: %q", ErrUnsupportedTopUpActorType, input.ActorType)
	}
	if input.ActorID == "" {
		return nil, fmt.Errorf("actorId is required")
	}
	if input.TopUpReference == "" {
		return nil, fmt.Errorf("topupReference is required")
	}
	return CreatePaymentSession(db, CreatePaymentSessionInput{
		TopUpReference:    input.TopUpReference,
		TopUpActorType:    input.ActorType,
		OperatorContextID: input.OperatorContextID,
		ClientID:          input.ActorID,
		// A topup has no order/store; the actor being funded is its own
		// scope. Reusing ActorID keeps store_id's existing NOT NULL
		// constraint satisfied without inventing a placeholder value that
		// could be mistaken for a real store.
		StoreID:          input.ActorID,
		PaymentMethod:    "official_wallet",
		AmountMinorUnits: input.AmountMinorUnits,
		Currency:         input.Currency,
		IdempotencyKey:   input.IdempotencyKey,
		CorrelationID:    input.CorrelationID,
	})
}

// HandleCreateTopUpSessionTrustedDsh mirrors
// HandleCreatePaymentSessionTrustedDsh exactly: only authenticated DSH may
// create a topup session, financial scope is bound server-side from the
// authenticated service context (never from the payload), and
// idempotency/correlation come strictly from headers.
func HandleCreateTopUpSessionTrustedDsh(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var request createTopUpSessionRequest
		if !decodeJSON(w, r, &request) {
			return
		}
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial OperatorContext is unavailable")
			return
		}
		input := CreateTopUpSessionInput{
			ActorType: request.ActorType, ActorID: request.ActorID, TopUpReference: request.TopUpReference,
			OperatorContextID: operatorContextID, AmountMinorUnits: request.AmountMinorUnits, Currency: request.Currency,
			IdempotencyKey: r.Header.Get("Idempotency-Key"), CorrelationID: r.Header.Get("X-Correlation-ID"),
		}
		if input.IdempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
			return
		}
		if input.CorrelationID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
			return
		}
		session, err := CreateTopUpSession(db, input)
		if errors.Is(err, ErrIdempotencyConflict) {
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "topup reference was already used with a different payload")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
	}
}
