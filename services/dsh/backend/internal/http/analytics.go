package http

import (
	"net/http"

	"dsh-api/internal/analytics"
	"dsh-api/internal/store"
)

// Analytics permission action on the control-panel surface. "operator"
// remains a valid fallback role during RBAC data migration.
const AnalyticsPermissionRead = "analytics.read"

func namedAnalyticsPeriod(w http.ResponseWriter, r *http.Request) (string, bool) {
	if r.URL.Query().Get("from") != "" || r.URL.Query().Get("to") != "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_ANALYTICS_RANGE", "this analytics slice accepts period only")
		return "", false
	}
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "today"
	}
	switch period {
	case "today", "week", "month":
		return period, true
	default:
		store.SendError(w, http.StatusBadRequest, "INVALID_ANALYTICS_PERIOD", "period must be today, week, or month")
		return "", false
	}
}

// GET /dsh/operator/analytics/platform
func (s *protectedStoreServer) handlePlatformKpis(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	if !ok {
		return
	}
	period, ok := namedAnalyticsPeriod(w, r)
	if !ok {
		return
	}
	kpis, err := analytics.GetPlatformKpis(s.db, period)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute platform kpis")
		return
	}
	store.SendJSON(w, http.StatusOK, kpis)
}

// GET /dsh/operator/analytics/orders
func (s *protectedStoreServer) handleOrderAnalytics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	if !ok {
		return
	}
	period, ok := namedAnalyticsPeriod(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetOrderAnalytics(s.db, period)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute order analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

// GET /dsh/operator/analytics/delivery
func (s *protectedStoreServer) handleDeliveryAnalytics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	if !ok {
		return
	}
	period, ok := namedAnalyticsPeriod(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetDeliveryAnalytics(s.db, period)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute delivery analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

// GET /dsh/operator/analytics/support
func (s *protectedStoreServer) handleSupportAnalytics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	if !ok {
		return
	}
	period, ok := namedAnalyticsPeriod(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetSupportAnalytics(s.db, period)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute support analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

// GET /dsh/operator/analytics/stores
func (s *protectedStoreServer) handleStoreAnalytics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	if !ok {
		return
	}
	data, err := analytics.GetStoreAnalytics(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute store analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

// GET /dsh/partner/analytics/performance
func (s *protectedStoreServer) handlePartnerPerformance(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	period, ok := namedAnalyticsPeriod(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetPartnerPerformance(s.db, storeID, period)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute partner performance")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}
