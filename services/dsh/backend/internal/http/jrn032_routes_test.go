package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN032AnalyticsRoutesRegistered(t *testing.T) {
	mux := NewRouter(nil, nil, nil, nil)
	RegisterPartnerSelfRoutes(mux, nil, nil, nil, nil)
	RegisterJRN032AnalyticsRoutes(mux, nil, nil, nil, nil)
	routes := []string{
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
		"/dsh/partner/analytics/performance",
	}
	for _, route := range routes {
		req := httptest.NewRequest(http.MethodGet, route, nil)
		_, pattern := mux.Handler(req)
		if pattern == "" {
			t.Errorf("route %s is not registered", route)
		}
	}
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
