package http

import "net/http"

// registerJRN032AnalyticsRoutes binds every operational-analytics slice exactly
// once from the terminal protected-route extension chain.
func registerJRN032AnalyticsRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/operator/analytics/platform", s.handlePlatformKpis)
	mux.HandleFunc("GET /dsh/operator/analytics/orders", s.handleOrderAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/delivery", s.handleDeliveryAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/support", s.handleSupportAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/stores", s.handleStoreAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/preparation-sla", s.handlePreparationSLAAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/captains", s.handleCaptainPerformanceAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/field", s.handleFieldPerformanceAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/drill-down/orders", s.handleOrderAnalyticsDrilldown)
	mux.HandleFunc("GET /dsh/operator/analytics/financial-snapshot", s.handleAnalyticsFinancialSnapshot)
	mux.HandleFunc("GET /dsh/operator/analytics/export.csv", s.handleAnalyticsExportCSV)
	mux.HandleFunc("GET /dsh/partner/analytics/performance", s.handlePartnerPerformance)
}
