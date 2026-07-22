package http

import (
	"net/http"
	"testing"
)

func TestJRN021OrderRescueRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterOrderRescueRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodPost, "/dsh/operator/support/order-rescue-cases", "POST /dsh/operator/support/order-rescue-cases"},
		{http.MethodGet, "/dsh/operator/support/order-rescue-cases", "GET /dsh/operator/support/order-rescue-cases"},
		{http.MethodGet, "/dsh/operator/support/order-rescue-cases/case-1", "GET /dsh/operator/support/order-rescue-cases/{caseId}"},
		{http.MethodPatch, "/dsh/operator/support/order-rescue-cases/case-1", "PATCH /dsh/operator/support/order-rescue-cases/{caseId}"},
		{http.MethodGet, "/dsh/operator/support/order-rescue-cases/case-1/events", "GET /dsh/operator/support/order-rescue-cases/{caseId}/events"},
	}
	for _, tc := range cases {
		request, err := http.NewRequest(tc.method, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(request)
		if pattern != tc.pattern {
			t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
		}
	}
}
