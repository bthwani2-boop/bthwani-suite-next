package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

func writeWltActorFinanceResponse(w http.ResponseWriter, status int, body []byte, err error) {
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func decodeActorFinanceJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return false
	}
	return true
}

func requireFinanceMutationIdempotency(w http.ResponseWriter, r *http.Request) (string, bool) {
	key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(key) < 8 || len(key) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return "", false
	}
	return key, true
}

func (s *protectedStoreServer) handleCaptainFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	query := url.Values{"captainId": {actor.ID}}
	status, body, err := s.wlt.FinanceReadWithOperatorContext(r.Context(), "/wlt/commissions", query, r.Header.Get("X-Correlation-ID"), actor.OperatorContextID)
	writeWltActorFinanceResponse(w, status, body, err)
}

// Historical captain and field URLs delegate to the same actor-scoped payout
// handlers used by the current /me routes. No compatibility route can create
// a payout without an active destination owned by the authenticated actor.
func (s *protectedStoreServer) handleCaptainFinancePayouts(w http.ResponseWriter, r *http.Request) {
	s.handleCaptainPayoutRequests(w, r)
}

func (s *protectedStoreServer) handleFieldFinanceCommissions(w http.ResponseWriter, r *http.Request) {
	s.handleFieldMeCommissions(w, r)
}

func (s *protectedStoreServer) handleFieldFinanceWallet(w http.ResponseWriter, r *http.Request) {
	s.handleFieldMeWallet(w, r)
}

func (s *protectedStoreServer) handleFieldFinancePayouts(w http.ResponseWriter, r *http.Request) {
	s.handleFieldPayoutRequests(w, r)
}
