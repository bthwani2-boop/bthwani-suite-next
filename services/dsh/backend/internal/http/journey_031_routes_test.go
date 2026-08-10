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
