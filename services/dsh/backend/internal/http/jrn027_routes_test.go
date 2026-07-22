package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN027GovernedSubscriptionRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/dsh/client/marketing/subscriptions/purchase"},
		{http.MethodGet, "/dsh/client/marketing/subscriptions/purchases/subp-1"},
		{http.MethodPost, "/dsh/client/marketing/subscriptions/subp-1/activate"},
		{http.MethodPost, "/dsh/client/marketing/subscriptions/00000000-0000-0000-0000-000000000001/renew"},
		{http.MethodPost, "/dsh/client/marketing/subscriptions/00000000-0000-0000-0000-000000000001/cancel"},
		{http.MethodGet, "/dsh/client/benefits"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		_, pattern := router.Handler(req)
		if pattern == "" {
			t.Fatalf("JRN-027 route is not registered: %s %s", tc.method, tc.path)
		}
	}
}
