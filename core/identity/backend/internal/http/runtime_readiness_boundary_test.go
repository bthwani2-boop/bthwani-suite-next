package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func readinessRequest() *http.Request {
	return httptest.NewRequest(http.MethodGet, "/identity/readiness", nil)
}

func TestRuntimeReadinessBoundaryRejectsMissingActivationSecret(t *testing.T) {
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	nextCalled := false
	handler := RuntimeReadinessBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, readinessRequest())

	if nextCalled {
		t.Fatal("readiness reached the database probe without activation security")
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsShortActivationSecret(t *testing.T) {
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "too-short")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingOperatorContext(t *testing.T) {
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", strings.Repeat("s", minimumActivationHMACSecretLength))
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryDelegatesConfiguredReadiness(t *testing.T) {
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", strings.Repeat("s", minimumActivationHMACSecretLength))
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	nextCalled := false
	handler := RuntimeReadinessBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, readinessRequest())

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("configured readiness was not delegated status=%d nextCalled=%v", response.Code, nextCalled)
	}
}

func TestRuntimeReadinessBoundaryDoesNotGateOtherRoutes(t *testing.T) {
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	handler := RuntimeReadinessBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	for _, path := range []string{"/identity/health", "/auth/login"} {
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, path, nil)

		handler.ServeHTTP(response, request)

		if response.Code != http.StatusNoContent {
			t.Fatalf("%s was unexpectedly readiness-gated: %d", path, response.Code)
		}
	}
}
