package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

// requiredPaymentPlatformContext resolves the financial platform context only
// from the authenticated Identity actor. Client headers, query parameters, and
// request bodies are not inputs to this trust boundary.
func requiredPaymentPlatformContext(w http.ResponseWriter, actorPlatformContextID string) (string, bool) {
	platformContextID := strings.TrimSpace(actorPlatformContextID)
	if platformContextID == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_PLATFORM_CONTEXT_ID", "authenticated actor platform context is required")
		return "", false
	}
	return platformContextID, true
}

// GET /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/timeline
func (s *protectedStoreServer) handleFinancePaymentSessionTimeline(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	platformContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	paymentSessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
	if paymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	status, body, err := s.wlt.ReadPaymentSessionTimeline(r.Context(), platformContextID, paymentSessionID, r.Header.Get("X-Correlation-ID"))
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT payment timeline read failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// POST /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/refresh-provider-status
func (s *protectedStoreServer) handleRefreshFinancePaymentSessionProviderStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator")
	if !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	platformContextID, ok := requiredPaymentPlatformContext(w, actor.OperatorContextID)
	if !ok {
		return
	}
	paymentSessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
	if paymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	status, body, err := s.wlt.RefreshPaymentSessionProviderStatus(
		r.Context(), platformContextID, paymentSessionID,
		r.Header.Get("X-Correlation-ID"), r.Header.Get("Idempotency-Key"),
	)
	if err != nil {
		store.SendError(w, http.StatusBadGateway, "WLT_UNAVAILABLE", "WLT provider status refresh failed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
