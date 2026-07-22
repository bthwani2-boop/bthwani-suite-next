package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN027WLTSubscriptionLifecycleRoutes(t *testing.T) {
	router := NewRouter(nil, true)
	cases := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/wlt/commercial/subscriptions"},
		{http.MethodGet, "/wlt/commercial/subscriptions/00000000-0000-0000-0000-000000000001/lifecycle"},
		{http.MethodPost, "/wlt/commercial/subscriptions/00000000-0000-0000-0000-000000000001/renew"},
		{http.MethodPost, "/wlt/commercial/subscriptions/00000000-0000-0000-0000-000000000001/cancel"},
		{http.MethodPost, "/wlt/commercial/subscriptions/expire-due"},
		{http.MethodGet, "/wlt/commercial/clients/client-1/benefits"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		_, pattern := router.Handler(req)
		if pattern == "" {
			t.Fatalf("JRN-027 WLT route is not registered: %s %s", tc.method, tc.path)
		}
	}
}
