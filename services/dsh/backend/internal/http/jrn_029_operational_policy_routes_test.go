package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN029OperationalPolicyRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterPlatformPolicyRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name   string
		method string
		path   string
	}{
		{"get operational profile", http.MethodGet, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111"},
		{"upsert operational profile", http.MethodPut, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111"},
		{"list delivery modes", http.MethodGet, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111/delivery-modes"},
		{"upsert delivery mode", http.MethodPut, "/dsh/operator/platform/operational-profiles/11111111-1111-1111-1111-111111111111/delivery-modes/bthwani_delivery"},
		{"evaluate operational policy", http.MethodPost, "/dsh/platform/operational-policy/evaluate"},
		{"list operational audit", http.MethodGet, "/dsh/operator/platform/operational-policy/audit"},
		{"rollback operational policy", http.MethodPost, "/dsh/operator/platform/operational-policy/audit/55555555-5555-5555-5555-555555555555/rollback"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.path, nil)
			_, pattern := router.Handler(request)
			if pattern == "" {
				t.Fatalf("%s %s: no registered handler", tc.method, tc.path)
			}
		})
	}
}
