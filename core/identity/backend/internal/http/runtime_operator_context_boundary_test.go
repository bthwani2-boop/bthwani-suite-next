package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRuntimeOperatorContextBoundaryRejectsUnconfiguredInternalRoutes(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	nextCalled := false
	handler := RuntimeOperatorContextBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))

	for _, path := range []string{
		"/internal/actors/search",
		"/internal/employees/provision",
		"/internal/partner/permission-bundles",
	} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if nextCalled {
			t.Fatalf("%s reached an internal handler without server-owned operator context", path)
		}
		if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "INTERNAL_API_UNAVAILABLE") {
			t.Fatalf("%s unexpected response status=%d body=%s", path, response.Code, response.Body.String())
		}
	}
}

func TestRuntimeOperatorContextBoundaryDelegatesConfiguredInternalRoutes(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	handler := RuntimeOperatorContextBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/internal/actors/search", nil))

	if response.Code != http.StatusNoContent {
		t.Fatalf("configured internal route was not delegated: %d", response.Code)
	}
}

func TestRuntimeOperatorContextBoundaryDoesNotGatePublicRoutes(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	handler := RuntimeOperatorContextBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	for _, path := range []string{"/identity/health", "/identity/readiness", "/auth/login"} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusNoContent {
			t.Fatalf("%s was unexpectedly internal-scope gated: %d", path, response.Code)
		}
	}
}
