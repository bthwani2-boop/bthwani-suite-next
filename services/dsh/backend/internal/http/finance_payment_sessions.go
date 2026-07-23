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
func requiredPaymentTenant(w http.ResponseWriter, r *http.Request, actorTenantID string) (string, bool) {
	tenantID := strings.TrimSpace(actorTenantID)
	if tenantID == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "authenticated actor tenant is required")
		return "", false
	}

	suppliedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	if suppliedTenantID == "" {
		suppliedTenantID = strings.TrimSpace(r.URL.Query().Get("tenantId"))
	}
	if suppliedTenantID != "" && suppliedTenantID != tenantID {
		store.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "tenant selector does not match authenticated actor")
		return "", false
	}
	return tenantID, true
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
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	paymentSessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
	if paymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	status, body, err := s.wlt.ReadPaymentSessionTimeline(r.Context(), tenantID, paymentSessionID, r.Header.Get("X-Correlation-ID"))
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
	tenantID, ok := requiredPaymentTenant(w, r, actor.TenantID)
	if !ok {
		return
	}
	paymentSessionID := strings.TrimSpace(r.PathValue("paymentSessionId"))
	if paymentSessionID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "paymentSessionId is required")
		return
	}
	status, body, err := s.wlt.RefreshPaymentSessionProviderStatus(
		r.Context(), tenantID, paymentSessionID,
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
