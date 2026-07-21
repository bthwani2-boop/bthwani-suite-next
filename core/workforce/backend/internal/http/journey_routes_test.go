package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWorkforceJourneyRoutesAreMounted(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{method: http.MethodPost, path: "/workforce/field-agents", pattern: "POST /workforce/field-agents"},
		{method: http.MethodPatch, path: "/workforce/field-agents/field-1", pattern: "PATCH /workforce/field-agents/{actorId}"},
		{method: http.MethodPost, path: "/workforce/field-agents/field-1/activation-codes", pattern: "POST /workforce/field-agents/{actorId}/activation-codes"},
		{method: http.MethodPost, path: "/workforce/captains", pattern: "POST /workforce/captains"},
		{method: http.MethodPost, path: "/workforce/employees", pattern: "POST /workforce/employees"},
		{method: http.MethodGet, path: "/workforce/me", pattern: "GET /workforce/me"},
		{method: http.MethodPatch, path: "/workforce/me", pattern: "PATCH /workforce/me"},
		{method: http.MethodGet, path: "/workforce/reference/supervisors", pattern: "GET /workforce/reference/supervisors"},
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

func TestWorkforceCorsAllowsGovernedMutations(t *testing.T) {
	t.Setenv("WORKFORCE_CORS_ALLOWED_ORIGINS", "https://control-panel.example.com")
	handler := CorsMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("preflight must not reach workforce handlers")
	}))
	request := httptest.NewRequest(http.MethodOptions, "/workforce/field-agents/field-1", nil)
	request.Header.Set("Origin", "https://control-panel.example.com")
	request.Header.Set("Access-Control-Request-Method", http.MethodPatch)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected 204 preflight, got %d", response.Code)
	}
	methods := response.Header().Get("Access-Control-Allow-Methods")
	for _, method := range []string{http.MethodPatch, http.MethodDelete} {
		if !strings.Contains(methods, method) {
			t.Fatalf("%s is missing from workforce browser methods: %q", method, methods)
		}
	}
}
