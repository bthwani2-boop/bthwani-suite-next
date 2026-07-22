package http

import (
	"net/http"
	"testing"
)

func TestJRN029OperationalPolicyRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPlatformPolicyRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodGet, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111", "GET /dsh/operator/platform/operational-profiles/{zoneId}"},
		{http.MethodPut, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111", "PUT /dsh/operator/platform/operational-profiles/{zoneId}"},
		{http.MethodGet, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111/delivery-modes", "GET /dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes"},
		{http.MethodPut, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111/delivery-modes/bthwani_delivery", "PUT /dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes/{fulfillmentMode}"},
		{http.MethodPost, "/dsh/platform/operational-policy/evaluate", "POST /dsh/platform/operational-policy/evaluate"},
		{http.MethodGet, "/dsh/operator/platform/operational-policy/audit", "GET /dsh/operator/platform/operational-policy/audit"},
		{http.MethodPost, "/dsh/operator/platform/operational-policy/audit/55555555-5555-5555-5555-555555555555/rollback", "POST /dsh/operator/platform/operational-policy/audit/{eventId}/rollback"},
	}

	for _, tc := range cases {
		request, err := http.NewRequest(tc.method, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(request)
		if pattern != tc.pattern {
			t.Fatalf("%s %s: expected %q, got %q", tc.method, tc.path, tc.pattern, pattern)
		}
	}
}
