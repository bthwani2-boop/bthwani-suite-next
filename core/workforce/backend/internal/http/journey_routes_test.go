package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type workforceJourneyRouteCase struct {
	method  string
	path    string
	pattern string
}

var workforceJourneyRoutes = []workforceJourneyRouteCase{
	{method: http.MethodGet, path: "/workforce/health", pattern: "GET /workforce/health"},
	{method: http.MethodGet, path: "/workforce/readiness", pattern: "GET /workforce/readiness"},
	{method: http.MethodPost, path: "/workforce/field-agents", pattern: "POST /workforce/field-agents"},
	{method: http.MethodGet, path: "/workforce/field-agents", pattern: "GET /workforce/field-agents"},
	{method: http.MethodGet, path: "/workforce/field-agents/field-1", pattern: "GET /workforce/field-agents/{actorId}"},
	{method: http.MethodPatch, path: "/workforce/field-agents/field-1", pattern: "PATCH /workforce/field-agents/{actorId}"},
	{method: http.MethodPost, path: "/workforce/field-agents/field-1/suspend", pattern: "POST /workforce/field-agents/{actorId}/suspend"},
	{method: http.MethodPost, path: "/workforce/field-agents/field-1/reactivate", pattern: "POST /workforce/field-agents/{actorId}/reactivate"},
	{method: http.MethodPost, path: "/workforce/field-agents/field-1/activation-codes", pattern: "POST /workforce/field-agents/{actorId}/activation-codes"},
	{method: http.MethodDelete, path: "/workforce/field-agents/field-1/activation-codes", pattern: "DELETE /workforce/field-agents/{actorId}/activation-codes"},
	{method: http.MethodPost, path: "/workforce/captains", pattern: "POST /workforce/captains"},
	{method: http.MethodGet, path: "/workforce/captains", pattern: "GET /workforce/captains"},
	{method: http.MethodGet, path: "/workforce/captains/captain-1", pattern: "GET /workforce/captains/{actorId}"},
	{method: http.MethodPatch, path: "/workforce/captains/captain-1", pattern: "PATCH /workforce/captains/{actorId}"},
	{method: http.MethodPost, path: "/workforce/captains/captain-1/suspend", pattern: "POST /workforce/captains/{actorId}/suspend"},
	{method: http.MethodPost, path: "/workforce/captains/captain-1/reactivate", pattern: "POST /workforce/captains/{actorId}/reactivate"},
	{method: http.MethodPost, path: "/workforce/captains/captain-1/activation-codes", pattern: "POST /workforce/captains/{actorId}/activation-codes"},
	{method: http.MethodDelete, path: "/workforce/captains/captain-1/activation-codes", pattern: "DELETE /workforce/captains/{actorId}/activation-codes"},
	{method: http.MethodPost, path: "/workforce/employees", pattern: "POST /workforce/employees"},
	{method: http.MethodGet, path: "/workforce/employees", pattern: "GET /workforce/employees"},
	{method: http.MethodGet, path: "/workforce/employees/employee-1", pattern: "GET /workforce/employees/{actorId}"},
	{method: http.MethodPatch, path: "/workforce/employees/employee-1", pattern: "PATCH /workforce/employees/{actorId}"},
	{method: http.MethodPost, path: "/workforce/employees/employee-1/suspend", pattern: "POST /workforce/employees/{actorId}/suspend"},
	{method: http.MethodPost, path: "/workforce/employees/employee-1/reactivate", pattern: "POST /workforce/employees/{actorId}/reactivate"},
	{method: http.MethodGet, path: "/workforce/me", pattern: "GET /workforce/me"},
	{method: http.MethodPatch, path: "/workforce/me", pattern: "PATCH /workforce/me"},
	{method: http.MethodGet, path: "/workforce/reference/cities", pattern: "GET /workforce/reference/cities"},
	{method: http.MethodGet, path: "/workforce/reference/shifts", pattern: "GET /workforce/reference/shifts"},
	{method: http.MethodPost, path: "/workforce/reference/shifts", pattern: "POST /workforce/reference/shifts"},
	{method: http.MethodPatch, path: "/workforce/reference/shifts/morning", pattern: "PATCH /workforce/reference/shifts/{code}"},
	{method: http.MethodGet, path: "/workforce/reference/supervisors", pattern: "GET /workforce/reference/supervisors"},
}

func TestWorkforceJourneyRoutesAreMounted(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	mux, ok := router.(*http.ServeMux)
	if !ok {
		t.Fatalf("expected workforce router to expose its governed ServeMux, got %T", router)
	}

	for _, tc := range workforceJourneyRoutes {
		request, err := http.NewRequest(tc.method, tc.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		_, pattern := mux.Handler(request)
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
