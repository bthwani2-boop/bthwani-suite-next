package http

import (
	"encoding/json"
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleFieldMeWallet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"actorId": {actor.ID}, "actorType": {"field"}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/wallets", query, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

func (s *protectedStoreServer) handleFieldMeCommissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/commissions", query, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

func (s *protectedStoreServer) handleFieldMeLedgerEntries(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"actorId": {actor.ID}, "actorType": {"field"}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/ledger/entries", query, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

func (s *protectedStoreServer) handleFieldMePayoutRequests(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	query := url.Values{"beneficiaryActorId": {actor.ID}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/payout-requests", query, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

func (s *protectedStoreServer) handleSubmitFieldMePayoutRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	
	type requestBody struct {
		AmountMinorUnits int64  `json:"amountMinorUnits"`
		Currency         string `json:"currency"`
		IdempotencyKey   string `json:"idempotencyKey"`
	}

	var req requestBody
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	if err := decoder.Decode(&req); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid payload")
		return
	}

	// Payload expected by WLT
	payload := map[string]any{
		"beneficiaryActorId":   actor.ID,
		"beneficiaryActorType": "field",
		"amountMinorUnits":     req.AmountMinorUnits,
		"currency":             req.Currency,
		"idempotencyKey":       req.IdempotencyKey,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to marshal request")
		return
	}

	status, body, err := s.wlt.FinanceWrite(r.Context(), http.MethodPost, "/wlt/payout-requests", payloadBytes, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}
