package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/analytics"
	"dsh-api/internal/store"
)

// Analytics permission action on the control-panel surface. Access is granted
// only by the canonical Identity permission readback.
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
	_, ok := s.ActorFromContext(r.Context())
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
	_, ok := s.ActorFromContext(r.Context())
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
	_, ok := s.ActorFromContext(r.Context())
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
	_, ok := s.ActorFromContext(r.Context())
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
	_, ok := s.ActorFromContext(r.Context())
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
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := strings.TrimSpace(r.URL.Query().Get("storeId"))
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "STORE_ID_REQUIRED", "storeId is required")
		return
	}
	if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID); err != nil {
		s.writeStoreError(w, err)
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
