package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

// requiredPaymentTenant resolves the finance tenant from the authenticated
// Identity actor. Browser-controlled selectors are never accepted as the
// authority boundary; an optional legacy selector may only confirm the actor
// tenant and is rejected when it disagrees.
func requiredPaymentTenant(w http.ResponseWriter, r *http.Request, actorOperatorContextID string) (string, bool) {
	operatorContextID := strings.TrimSpace(actorOperatorContextID)
	if operatorContextID == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "authenticated actor tenant is required")
		return "", false
	}

	suppliedOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	if suppliedOperatorContextID == "" {
		suppliedOperatorContextID = strings.TrimSpace(r.URL.Query().Get("operatorContextId"))
	}
	if suppliedOperatorContextID != "" && suppliedOperatorContextID != operatorContextID {
		store.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "tenant selector does not match authenticated actor")
		return "", false
	}
	return operatorContextID, true
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
	operatorContextID, ok := requiredPaymentTenant(w, r, actor.OperatorContextID)
	if !ok {
		return
	}
	paymentSessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
	if paymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	status, body, err := s.wlt.ReadPaymentSessionTimeline(r.Context(), operatorContextID, paymentSessionID, r.Header.Get("X-Correlation-ID"))
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
	operatorContextID, ok := requiredPaymentTenant(w, r, actor.OperatorContextID)
	if !ok {
		return
	}
	paymentSessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
	if paymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	status, body, err := s.wlt.RefreshPaymentSessionProviderStatus(
		r.Context(), operatorContextID, paymentSessionID,
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
