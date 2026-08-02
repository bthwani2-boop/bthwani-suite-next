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

func configureIdentityRuntime(t *testing.T) {
	t.Helper()
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", strings.Repeat("a", minimumActivationHMACSecretLength))
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", strings.Repeat("w", minimumInternalServiceTokenLength))
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", strings.Repeat("d", minimumInternalServiceTokenLength))
}

func TestRuntimeReadinessBoundaryRejectsMissingActivationSecret(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "")
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
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "too-short")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingOperatorContext(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingWorkforceServiceToken(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingDshServiceToken(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsShortInternalServiceToken(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "too-short")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler()).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryDelegatesConfiguredReadiness(t *testing.T) {
	configureIdentityRuntime(t)
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
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "")
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "")
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
