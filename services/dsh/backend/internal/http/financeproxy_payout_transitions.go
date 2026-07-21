package http

import (
	"net/http"
	"net/url"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) proxyFinancePayoutTransition(w http.ResponseWriter, r *http.Request, action string) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	payoutID := r.PathValue("payoutId")
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.FinanceWrite(
		r.Context(),
		http.MethodPost,
		"/wlt/payout-requests/"+url.PathEscape(payoutID)+"/"+action,
		operatorWriteBody(actor.ID),
		r.Header.Get("X-Correlation-ID"),
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// POST /dsh/control-panel/finance/payout-requests/{payoutId}/process
func (s *protectedStoreServer) handleProcessFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.proxyFinancePayoutTransition(w, r, "process")
}

// POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete
func (s *protectedStoreServer) handleCompleteFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.proxyFinancePayoutTransition(w, r, "complete")
}

// POST /dsh/control-panel/finance/payout-requests/{payoutId}/fail
// WLT intentionally returns RECONCILIATION_REQUIRED for provider-result
// journeys; exposing this route keeps the contract explicit without letting
// DSH invent a financial outcome.
func (s *protectedStoreServer) handleFailFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.proxyFinancePayoutTransition(w, r, "fail")
}
