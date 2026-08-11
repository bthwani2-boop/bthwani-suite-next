package http

import (
	"net/http"
	"net/url"
	"strings"

	"dsh-api/internal/store"
)

func (s *protectedStoreServer) proxyFinancePayoutTransition(w http.ResponseWriter, r *http.Request, action string) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	operatorContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	payoutID := strings.TrimSpace(r.PathValue("payoutId"))
	if payoutID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payoutId is required")
		return
	}
	status, body, err := s.wlt.FinanceWriteWithOperatorContext(
		r.Context(),
		http.MethodPost,
		"/wlt/payout-requests/"+url.PathEscape(payoutID)+"/"+action,
		operatorWriteBody(actor.ID),
		correlationForActorMutation(r, "payout-"+action+"-"+payoutID),
		r.Header.Get("Idempotency-Key"),
		operatorContextID,
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT finance write failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete
//
// The provider-managed process/fail transitions are gone: the current Cash-Out
// model executes and independently verifies an external official-wallet
// transfer against a frozen settlement batch, and completion reads that
// verified evidence. DSH proxies the governed transitions only; it never
// invents a financial outcome.
func (s *protectedStoreServer) handleCompleteFinancePayoutRequest(w http.ResponseWriter, r *http.Request) {
	s.proxyFinancePayoutTransition(w, r, "complete")
}
