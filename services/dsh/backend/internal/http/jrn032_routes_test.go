package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN032AnalyticsRoutesRegistered(t *testing.T) {
	mux := NewRouter(nil, nil, nil, nil)
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
