package http

import (
	"net/http"
	"strings"
	"testing"
)

func TestJRN029OperationalPolicyRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPlatformPolicyRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		method       string
		path         string
		pathTemplate string
	}{
		{http.MethodGet, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111", "/dsh/operator/platform/operational-profiles/{zoneId}"},
		{http.MethodPut, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111", "/dsh/operator/platform/operational-profiles/{zoneId}"},
		{http.MethodGet, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111/delivery-modes", "/dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes"},
		{http.MethodPut, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111/delivery-modes/bthwani_delivery", "/dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes/{fulfillmentMode}"},
		{http.MethodPost, "/dsh/platform/operational-policy/evaluate", "/dsh/platform/operational-policy/evaluate"},
		{http.MethodGet, "/dsh/operator/platform/operational-policy/audit", "/dsh/operator/platform/operational-policy/audit"},
		{http.MethodPost, "/dsh/operator/platform/operational-policy/audit/55555555-5555-5555-5555-555555555555/rollback", "/dsh/operator/platform/operational-policy/audit/{eventId}/rollback"},
	}

	for _, tc := range cases {
		request, err := http.NewRequest(tc.method, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(request)
		if pattern == "" {
			t.Fatalf("%s %s: no registered handler", tc.method, tc.path)
		}
		if strings.Contains(pattern, " ") && !strings.HasPrefix(pattern, tc.method+" ") {
			t.Fatalf("%s %s: matched wrong method pattern %q", tc.method, tc.path, pattern)
		}
		if !strings.HasSuffix(pattern, tc.pathTemplate) {
			t.Fatalf("%s %s: expected route template %q, got %q", tc.method, tc.path, tc.pathTemplate, pattern)
		}
	}
}
