package http

import (
	"net/http"
	"testing"
)

func TestJRN022SpecialRequestRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil)

	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{
			name:    "client creates special request",
			method:  http.MethodPost,
			path:    "/dsh/client/special-requests",
			pattern: "POST /dsh/client/special-requests",
		},
		{
			name:    "client lists special requests",
			method:  http.MethodGet,
			path:    "/dsh/client/special-requests",
			pattern: "GET /dsh/client/special-requests",
		},
		{
			name:    "client reads special request",
			method:  http.MethodGet,
			path:    "/dsh/client/special-requests/request-1",
			pattern: "GET /dsh/client/special-requests/{requestId}",
		},
		{
			name:    "client cancels special request",
			method:  http.MethodPost,
			path:    "/dsh/client/special-requests/request-1/cancel",
			pattern: "POST /dsh/client/special-requests/{requestId}/cancel",
		},
		{
			name:    "client approves quote",
			method:  http.MethodPost,
			path:    "/dsh/client/special-requests/request-1/approve-quote",
			pattern: "POST /dsh/client/special-requests/{requestId}/approve-quote",
		},
		{
			name:    "client reads requested information",
			method:  http.MethodGet,
			path:    "/dsh/client/special-requests/request-1/information-exchange",
			pattern: "GET /dsh/client/special-requests/{requestId}/information-exchange",
		},
		{
			name:    "client responds with requested information",
			method:  http.MethodPost,
			path:    "/dsh/client/special-requests/request-1/information-response",
			pattern: "POST /dsh/client/special-requests/{requestId}/information-response",
		},
		{
			name:    "client reads execution evidence",
			method:  http.MethodGet,
			path:    "/dsh/client/special-requests/request-1/execution",
			pattern: "GET /dsh/client/special-requests/{requestId}/execution",
		},
		{
			name:    "operator lists special requests",
			method:  http.MethodGet,
			path:    "/dsh/operator/special-requests",
			pattern: "GET /dsh/operator/special-requests",
		},
		{
			name:    "operator reads special request",
			method:  http.MethodGet,
			path:    "/dsh/operator/special-requests/request-1",
			pattern: "GET /dsh/operator/special-requests/{requestId}",
		},
		{
			name:    "operator reads information exchange",
			method:  http.MethodGet,
			path:    "/dsh/operator/special-requests/request-1/information-exchange",
			pattern: "GET /dsh/operator/special-requests/{requestId}/information-exchange",
		},
		{
			name:    "operator requests client information",
			method:  http.MethodPost,
			path:    "/dsh/operator/special-requests/request-1/information-request",
			pattern: "POST /dsh/operator/special-requests/{requestId}/information-request",
		},
		{
			name:    "operator reads execution evidence",
			method:  http.MethodGet,
			path:    "/dsh/operator/special-requests/request-1/execution",
			pattern: "GET /dsh/operator/special-requests/{requestId}/execution",
		},
		{
			name:    "operator transitions special request",
			method:  http.MethodPatch,
			path:    "/dsh/operator/special-requests/request-1",
			pattern: "PATCH /dsh/operator/special-requests/{requestId}",
		},
		{
			name:    "operator dispatches special request",
			method:  http.MethodPost,
			path:    "/dsh/operator/special-requests/request-1/dispatch",
			pattern: "POST /dsh/operator/special-requests/{requestId}/dispatch",
		},
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
