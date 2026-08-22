package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

type captainTopUpCreateBody struct {
	TopUpReference   string `json:"topupReference"`
	AmountMinorUnits int64  `json:"amountMinorUnits"`
	Currency         string `json:"currency"`
}

func requireFinanceCorrelation(w http.ResponseWriter, r *http.Request) (string, bool) {
	value := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if value == "" || len(value) > 200 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID is required")
		return "", false
	}
	return value, true
}

func (s *protectedStoreServer) handleCaptainCreateTopUpSession(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	idempotencyKey, ok := requireFinanceMutationIdempotency(w, r)
	if !ok {
		return
	}
	correlationID, ok := requireFinanceCorrelation(w, r)
	if !ok {
		return
	}
	var input captainTopUpCreateBody
	if !decodeActorFinanceJSON(w, r, &input) {
		return
	}
	input.TopUpReference = strings.TrimSpace(input.TopUpReference)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if input.TopUpReference == "" || len(input.TopUpReference) > 200 || input.AmountMinorUnits <= 0 || len(input.Currency) != 3 {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "topupReference, positive amountMinorUnits and a three-letter currency are required")
		return
	}
	status, body, err := s.wlt.CreateCaptainTopUpSession(
		wlt.WithOperatorContext(r.Context(), actor.OperatorContextID), actor.ID, input.TopUpReference, input.AmountMinorUnits, input.Currency,
		correlationID, idempotencyKey, actor.OperatorContextID,
	)
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainReadTopUpSession(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	correlationID, ok := requireFinanceCorrelation(w, r)
	if !ok {
		return
	}
	status, body, err := s.wlt.ReadCaptainTopUpSession(
		wlt.WithOperatorContext(r.Context(), actor.OperatorContextID), r.PathValue("topUpSessionId"), actor.ID,
		correlationID, actor.OperatorContextID,
	)
	if errors.Is(err, wlt.ErrCaptainTopUpNotOwned) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "top-up session not found")
		return
	}
	writeWltActorFinanceResponse(w, status, body, err)
}

func (s *protectedStoreServer) handleCaptainMutateTopUpSession(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	idempotencyKey, ok := requireFinanceMutationIdempotency(w, r)
	if !ok {
		return
	}
	correlationID, ok := requireFinanceCorrelation(w, r)
	if !ok {
		return
	}
	operation := r.PathValue("operation")
	if operation != "authorize" && operation != "capture" {
		store.SendError(w, http.StatusBadRequest, "INVALID_OPERATION", "operation must be authorize or capture")
		return
	}
	status, body, err := s.wlt.MutateCaptainTopUpSession(
		wlt.WithOperatorContext(r.Context(), actor.OperatorContextID), r.PathValue("topUpSessionId"), operation, correlationID,
		idempotencyKey, actor.ID, actor.OperatorContextID,
	)
	if errors.Is(err, wlt.ErrCaptainTopUpNotOwned) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "top-up session not found")
		return
	}
	writeWltActorFinanceResponse(w, status, body, err)
}
