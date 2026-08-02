package http

import (
	"net/http"
	"testing"
)

func TestCaptainReadinessClosure_RoutesExposed(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{name: "self readiness", method: http.MethodGet, path: "/dsh/captain/me/readiness", pattern: "GET /dsh/captain/me/readiness"},
		{name: "operator read captain readiness", method: http.MethodGet, path: "/dsh/operator/dispatch/captains/cap-1/readiness", pattern: "GET /dsh/operator/dispatch/captains/{captainId}/readiness"},
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
