package http

import (
	"encoding/csv"
	"errors"
	"net/http"
	"strconv"
	"time"

	"dsh-api/internal/analytics"
	"dsh-api/internal/store"
)

func parseAnalyticsWindow(w http.ResponseWriter, r *http.Request) (analytics.Window, bool) {
	window, err := analytics.ParseWindow(
		r.URL.Query().Get("period"),
		r.URL.Query().Get("from"),
		r.URL.Query().Get("to"),
		time.Now().UTC(),
	)
	if errors.Is(err, analytics.ErrInvalidAnalyticsPeriod) {
		store.SendError(w, http.StatusBadRequest, "INVALID_ANALYTICS_PERIOD", "period must be today, week, or month")
		return analytics.Window{}, false
	}
	if errors.Is(err, analytics.ErrInvalidAnalyticsRange) {
		store.SendError(w, http.StatusBadRequest, "INVALID_ANALYTICS_RANGE", "from/to must form a valid range no longer than 366 days")
		return analytics.Window{}, false
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return analytics.Window{}, false
	}
	return window, true
}

func analyticsLimit(r *http.Request, fallback int) int {
	value, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func (s *protectedStoreServer) requireAnalyticsOperator(w http.ResponseWriter, r *http.Request) bool {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	return ok
}

func (s *protectedStoreServer) handlePreparationSLAAnalytics(w http.ResponseWriter, r *http.Request) {
	if !s.requireAnalyticsOperator(w, r) {
		return
	}
	window, ok := parseAnalyticsWindow(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetPreparationSLAAnalytics(s.db, window, r.URL.Query().Get("storeId"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_QUERY_FAILED", "failed to compute preparation SLA analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

func (s *protectedStoreServer) handleCaptainPerformanceAnalytics(w http.ResponseWriter, r *http.Request) {
	if !s.requireAnalyticsOperator(w, r) {
		return
	}
	window, ok := parseAnalyticsWindow(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetCaptainPerformance(s.db, window, analyticsLimit(r, 50))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_QUERY_FAILED", "failed to compute captain performance analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

func (s *protectedStoreServer) handleFieldPerformanceAnalytics(w http.ResponseWriter, r *http.Request) {
	if !s.requireAnalyticsOperator(w, r) {
		return
	}
	window, ok := parseAnalyticsWindow(w, r)
	if !ok {
		return
	}
	data, err := analytics.GetFieldPerformance(s.db, window, analyticsLimit(r, 50))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_QUERY_FAILED", "failed to compute field performance analytics")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

func (s *protectedStoreServer) handleOrderAnalyticsDrilldown(w http.ResponseWriter, r *http.Request) {
	if !s.requireAnalyticsOperator(w, r) {
		return
	}
	window, ok := parseAnalyticsWindow(w, r)
	if !ok {
		return
	}
	data, err := analytics.ListOrderDrilldown(
		s.db,
		window,
		r.URL.Query().Get("storeId"),
		r.URL.Query().Get("status"),
		analyticsLimit(r, 50),
	)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_QUERY_FAILED", "failed to load analytics drill-down")
		return
	}
	store.SendJSON(w, http.StatusOK, data)
}

func (s *protectedStoreServer) handleAnalyticsFinancialSnapshot(w http.ResponseWriter, r *http.Request) {
	if !s.requireAnalyticsOperator(w, r) {
		return
	}
	snapshot, err := s.wlt.ReadAnalyticsFinancialSnapshot(r.Context())
	if err != nil {
		store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
			"financialSnapshot": snapshot,
			"error": map[string]string{
				"code": "WLT_ANALYTICS_UNAVAILABLE",
				"message": "financial analytics remain owned by WLT and are currently unavailable",
			},
		})
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"financialSnapshot": snapshot})
}

func (s *protectedStoreServer) handleAnalyticsExportCSV(w http.ResponseWriter, r *http.Request) {
	if !s.requireAnalyticsOperator(w, r) {
		return
	}
	window, ok := parseAnalyticsWindow(w, r)
	if !ok {
		return
	}
	preparation, err := analytics.GetPreparationSLAAnalytics(s.db, window, r.URL.Query().Get("storeId"))
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_EXPORT_FAILED", "failed to compute preparation export")
		return
	}
	captains, err := analytics.GetCaptainPerformance(s.db, window, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_EXPORT_FAILED", "failed to compute captain export")
		return
	}
	field, err := analytics.GetFieldPerformance(s.db, window, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "ANALYTICS_EXPORT_FAILED", "failed to compute field export")
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="jrn-032-operational-analytics.csv"`)
	writer := csv.NewWriter(w)
	_ = writer.Write([]string{"section", "identity", "metric", "value", "windowFrom", "windowTo", "source"})
	write := func(section, identity, metric, value string) {
		_ = writer.Write([]string{section, identity, metric, value, window.From.Format(time.RFC3339), window.To.Format(time.RFC3339), "DSH"})
	}
	write("preparation", "platform", "totalMeasured", strconv.Itoa(preparation.TotalMeasured))
	write("preparation", "platform", "withinSla", strconv.Itoa(preparation.WithinSLA))
	write("preparation", "platform", "breachedSla", strconv.Itoa(preparation.BreachedSLA))
	write("preparation", "platform", "openPastEstimate", strconv.Itoa(preparation.OpenPastEstimate))
	write("preparation", "platform", "averagePreparationMinutes", strconv.FormatFloat(preparation.AveragePreparationMinutes, 'f', 2, 64))
	for _, row := range captains.Rows {
		write("captain", row.CaptainID, "assignments", strconv.Itoa(row.Assignments))
		write("captain", row.CaptainID, "completionRate", strconv.FormatFloat(row.CompletionRate, 'f', 2, 64))
	}
	for _, row := range field.Rows {
		write("field", row.FieldAgentID, "visits", strconv.Itoa(row.Visits))
		write("field", row.FieldAgentID, "completionRate", strconv.FormatFloat(row.CompletionRate, 'f', 2, 64))
	}
	writer.Flush()
	if writer.Error() != nil {
		return
	}
}
