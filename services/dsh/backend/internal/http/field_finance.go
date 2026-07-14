package http

import (
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
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/references/wallet-status", query, r.Header.Get("X-Correlation-ID"))
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
	query := url.Values{"actorId": {actor.ID}, "actorType": {"field"}}
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
	query := url.Values{"actorId": {actor.ID}, "actorType": {"field"}}
	status, body, err := s.wlt.FinanceRead(r.Context(), "/wlt/settlements", query, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(body)
}

func (s *protectedStoreServer) handleSubmitFieldMePayoutRequest(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"pending"}`))
}
