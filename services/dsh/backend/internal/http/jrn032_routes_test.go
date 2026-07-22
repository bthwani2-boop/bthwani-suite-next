package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func assertRegisteredRoute(t *testing.T, mux *http.ServeMux, route string) {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, route, nil)
	_, pattern := mux.Handler(req)
	if pattern == "" {
		t.Fatalf("route %s is not registered", route)
	}
}

func TestJRN032AnalyticsRoutesRegistered(t *testing.T) {
	operatorMux := NewRouter(nil, nil, nil, nil)
	operatorRoutes := []string{
		"/dsh/operator/analytics/platform",
		"/dsh/operator/analytics/orders",
		"/dsh/operator/analytics/delivery",
		"/dsh/operator/analytics/support",
		"/dsh/operator/analytics/stores",
		"/dsh/operator/analytics/preparation-sla",
		"/dsh/operator/analytics/captains",
		"/dsh/operator/analytics/field",
		"/dsh/operator/analytics/drill-down/orders",
		"/dsh/operator/analytics/financial-snapshot",
		"/dsh/operator/analytics/export.csv",
	}
	for _, route := range operatorRoutes {
		assertRegisteredRoute(t, operatorMux, route)
	}

	partnerMux := http.NewServeMux()
	RegisterPartnerSelfRoutes(partnerMux, nil, nil, nil, nil)
	assertRegisteredRoute(t, partnerMux, "/dsh/partner/analytics/performance")
}

func TestNamedAnalyticsPeriodRejectsUnknownValues(t *testing.T) {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/analytics/orders?period=quarter", nil)
	if period, ok := namedAnalyticsPeriod(response, request); ok || period != "" {
		t.Fatalf("period=%q ok=%v", period, ok)
	}
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d", response.Code)
	}
}

func TestNamedAnalyticsPeriodDefaultsToToday(t *testing.T) {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/analytics/orders", nil)
	period, ok := namedAnalyticsPeriod(response, request)
	if !ok || period != "today" {
		t.Fatalf("period=%q ok=%v", period, ok)
	}
}
