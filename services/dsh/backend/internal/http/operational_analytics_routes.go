package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterOperationalAnalyticsRoutes binds the operational-analytics routes
// that do not already have a canonical compatibility owner in NewRouter.
// Partner self-service performance remains owned by RegisterPartnerSelfRoutes;
// registering it here too causes net/http ServeMux to panic during bootstrap.
// The support route remains registered once in NewRouter and delegates through
// handleGetSupportAnalytics to the same handleSupportAnalytics implementation.
func RegisterOperationalAnalyticsRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	s := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/analytics/platform", s.withPermission("control-panel", AnalyticsPermissionRead, s.handlePlatformKpis))
	mux.HandleFunc("GET /dsh/operator/analytics/orders", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleOrderAnalytics))
	mux.HandleFunc("GET /dsh/operator/analytics/delivery", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleDeliveryAnalytics))
	mux.HandleFunc("GET /dsh/operator/analytics/stores", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleStoreAnalytics))
	mux.HandleFunc("GET /dsh/operator/analytics/preparation-sla", s.withPermission("control-panel", AnalyticsPermissionRead, s.handlePreparationSLAAnalytics))
	mux.HandleFunc("GET /dsh/operator/analytics/captains", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleCaptainPerformanceAnalytics))
	mux.HandleFunc("GET /dsh/operator/analytics/field", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleFieldPerformanceAnalytics))
	mux.HandleFunc("GET /dsh/operator/analytics/drill-down/orders", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleOrderAnalyticsDrilldown))
	mux.HandleFunc("GET /dsh/operator/analytics/financial-snapshot", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleAnalyticsFinancialSnapshot))
	mux.HandleFunc("GET /dsh/operator/analytics/export.csv", s.withPermission("control-panel", AnalyticsPermissionRead, s.handleAnalyticsExportCSV))
}