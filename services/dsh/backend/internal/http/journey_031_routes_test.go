package http

import (
	"net/http"
	"testing"
)

func TestJourney031ExposesGovernedAdministrationRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil, nil)
	RegisterAdministrationRoutes(router, nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{name: "list audit", method: http.MethodGet, path: "/dsh/operator/admin/audit", pattern: "GET /dsh/operator/admin/audit"},
		{name: "replace failed role definition", method: http.MethodPost, path: "/dsh/operator/admin/role-requests/request-1/replacements", pattern: "POST /dsh/operator/admin/role-requests/{requestId}/replacements"},
		{name: "replace failed role assignment", method: http.MethodPost, path: "/dsh/operator/admin/approvals/approval-1/replacements", pattern: "POST /dsh/operator/admin/approvals/{approvalId}/replacements"},
		{name: "replace failed rollback", method: http.MethodPost, path: "/dsh/operator/admin/rollback-requests/request-1/replacements", pattern: "POST /dsh/operator/admin/rollback-requests/{requestId}/replacements"},
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

	for _, path := range []string{"/dsh/operator/admin/partners", "/dsh/operator/admin/captains"} {
		request, err := http.NewRequest(http.MethodGet, path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := router.Handler(request)
		if pattern != "" {
			t.Fatalf("superseded local projection route %q remains reachable as %q", path, pattern)
		}
	}
}
