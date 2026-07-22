package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

func requiredPaymentTenant(w http.ResponseWriter, r *http.Request) (string, bool) {
	tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	if tenantID == "" {
		store.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required")
		return "", false
	}
	return tenantID, true
}

// GET /dsh/control-panel/finance/payment-sessions/{paymentSessionId}/timeline
func (s *protectedStoreServer) handleFinancePaymentSessionTimeline(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionRead, "operator"); !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r)
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
	if _, ok := s.requirePermission(w, r, "control-panel", FinancePermissionManage, "operator"); !ok {
		return
	}
	if !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT integration is not configured")
		return
	}
	tenantID, ok := requiredPaymentTenant(w, r)
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
