package http

import (
	"net/http"
	"testing"
)

func TestJourney031ExposesGovernedAdministrationRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterAdministrationRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{name: "list roles", method: http.MethodGet, path: "/dsh/operator/admin/roles", pattern: "GET /dsh/operator/admin/roles"},
		{name: "list staff", method: http.MethodGet, path: "/dsh/operator/admin/staff", pattern: "GET /dsh/operator/admin/staff"},
		{name: "request role assignment", method: http.MethodPost, path: "/dsh/operator/admin/staff/actor-2/roles", pattern: "POST /dsh/operator/admin/staff/{staffId}/roles"},
		{name: "list approvals", method: http.MethodGet, path: "/dsh/operator/admin/approvals?status=pending", pattern: "GET /dsh/operator/admin/approvals"},
		{name: "review approval", method: http.MethodPost, path: "/dsh/operator/admin/approvals/approval-1/review", pattern: "POST /dsh/operator/admin/approvals/{approvalId}/review"},
		{name: "list partner activations", method: http.MethodGet, path: "/dsh/operator/admin/partners", pattern: "GET /dsh/operator/admin/partners"},
		{name: "list captain credentials", method: http.MethodGet, path: "/dsh/operator/admin/captains", pattern: "GET /dsh/operator/admin/captains"},
		{name: "list audit", method: http.MethodGet, path: "/dsh/operator/admin/audit", pattern: "GET /dsh/operator/admin/audit"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			request, err := http.NewRequest(tc.method, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			_, pattern := router.Handler(request)
			if pattern != tc.pattern {
				t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
			}
		})
	}
}
