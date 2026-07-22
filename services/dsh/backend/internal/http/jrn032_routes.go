package http

import "net/http"

// registerJRN032AnalyticsRoutes binds only the analytics routes that are not
// already owned by an earlier domain registration. Support analytics remains
// in server.go, and partner performance remains in partner_self_routes.go.
func registerJRN032AnalyticsRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/operator/analytics/platform", s.handlePlatformKpis)
	mux.HandleFunc("GET /dsh/operator/analytics/orders", s.handleOrderAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/delivery", s.handleDeliveryAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/stores", s.handleStoreAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/preparation-sla", s.handlePreparationSLAAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/captains", s.handleCaptainPerformanceAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/field", s.handleFieldPerformanceAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/drill-down/orders", s.handleOrderAnalyticsDrilldown)
	mux.HandleFunc("GET /dsh/operator/analytics/financial-snapshot", s.handleAnalyticsFinancialSnapshot)
	mux.HandleFunc("GET /dsh/operator/analytics/export.csv", s.handleAnalyticsExportCSV)
}
