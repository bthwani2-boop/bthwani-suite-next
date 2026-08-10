package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) handleFieldMeWallet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.FinanceReadWalletWithOperatorContext(trustedContext, "field", actor.ID, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFieldMeCommissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {"field"}}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.FinanceReadWithOperatorContext(trustedContext, "/wlt/commissions", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFieldMeLedgerEntries(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"actorId": {actor.ID}, "actorType": {"field"}}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.FinanceReadWithOperatorContext(trustedContext, "/wlt/ledger/entries", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleFieldMePayoutRequests(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}, "beneficiaryActorType": {"field"}}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.FinanceReadWithOperatorContext(trustedContext, "/wlt/payout-requests", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func (s *protectedStoreServer) handleSubmitFieldMePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}

	var request struct {
		AmountMinorUnits int64  `json:"amountMinorUnits"`
		Currency         string `json:"currency"`
		IdempotencyKey   string `json:"idempotencyKey"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	if err := decoder.Decode(&request); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid payload")
		return
	}
	request.Currency = strings.TrimSpace(request.Currency)
	request.IdempotencyKey = strings.TrimSpace(request.IdempotencyKey)
	if request.AmountMinorUnits <= 0 || request.Currency == "" || request.IdempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "positive amount, currency, and idempotencyKey are required")
		return
	}

	payload := map[string]any{
		"beneficiaryActorId":   actor.ID,
		"beneficiaryActorType": "field",
		"amountMinorUnits":     request.AmountMinorUnits,
		"currency":             request.Currency,
		"idempotencyKey":       request.IdempotencyKey,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to marshal request")
		return
	}

	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		correlationID = request.IdempotencyKey
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.FinanceWriteWithOperatorContext(trustedContext, http.MethodPost, "/wlt/payout-requests", payloadBytes, correlationID, r.Header.Get("Idempotency-Key"), actor.OperatorContextID)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
