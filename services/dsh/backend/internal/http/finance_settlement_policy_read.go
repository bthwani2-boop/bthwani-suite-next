package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// GET /dsh/control-panel/finance/settlement-policies/{partnerId}
// WLT remains the sole owner of settlement-policy truth. DSH forwards only an
// operator-authorized, trusted-context read and does not cache or reinterpret it.
func (s *protectedStoreServer) handleGetFinanceSettlementPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	partnerID := strings.TrimSpace(r.PathValue("partnerId"))
	if partnerID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "partnerId is required")
		return
	}
	trustedContext := wlt.WithOperatorContext(r.Context(), actor.OperatorContextID)
	status, body, err := s.wlt.ExecuteFinanceRead(
		trustedContext,
		"finance.settlement_policy.read",
		map[string]string{"partnerId": partnerID},
		nil,
		r.Header.Get("X-Correlation-ID"),
		actor.OperatorContextID,
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT settlement policy read failed")
		return
	}
	w.Header().Set("Cache-Control", "private, no-store")
	writeFinanceResponse(w, status, body, nil)
}
