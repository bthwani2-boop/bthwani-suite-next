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
	}), nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, readinessRequest())

	if nextCalled {
		t.Fatal("readiness reached the database probe without activation security")
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), reasonSigningKeyInvalid) {
		t.Fatalf("missing governed signing-key reason: %s", response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsShortActivationSecret(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "too-short")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler(), nil).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingOperatorContext(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler(), nil).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingWorkforceServiceToken(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler(), nil).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingDshServiceToken(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler(), nil).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsShortInternalServiceToken(t *testing.T) {
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "too-short")
	response := httptest.NewRecorder()

	RuntimeReadinessBoundary(http.NotFoundHandler(), nil).ServeHTTP(response, readinessRequest())

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("unexpected readiness response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryRejectsMissingDatabaseConfiguration(t *testing.T) {
	configureIdentityRuntime(t)
	nextCalled := false
	handler := RuntimeReadinessBoundary(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}), nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, readinessRequest())

	if nextCalled || response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("missing database did not fail closed status=%d nextCalled=%v body=%s", response.Code, nextCalled, response.Body.String())
	}
}

func TestRuntimeReadinessBoundaryHandlesHealthDelegatesReadsAndGatesMutations(t *testing.T) {
	resetRuntimeProbeState()
	lastReadinessFailed.Store(true)
	readinessSnapshot.Lock()
	readinessSnapshot.value = runtimeStatusResponse{
		Service: "core-identity",
		Checks: []runtimeCheckStatus{},
		ReasonCodes: []string{reasonReadinessUnproven},
	}
	readinessSnapshot.Unlock()
	configureIdentityRuntime(t)
	nextCalls := 0
	handler := runtimeReadinessBoundary(readyRuntimeStore(), http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalls++
		w.WriteHeader(http.StatusNoContent)
	}))

	healthBeforeReadiness := httptest.NewRecorder()
	handler.ServeHTTP(healthBeforeReadiness, httptest.NewRequest(http.MethodGet, "/identity/health", nil))
	if healthBeforeReadiness.Code != http.StatusOK || !strings.Contains(healthBeforeReadiness.Body.String(), `"status":"DEGRADED"`) || !strings.Contains(healthBeforeReadiness.Body.String(), reasonReadinessUnproven) {
		t.Fatalf("health claimed success before readiness status=%d body=%s", healthBeforeReadiness.Code, healthBeforeReadiness.Body.String())
	}

	readiness := httptest.NewRecorder()
	handler.ServeHTTP(readiness, readinessRequest())
	if readiness.Code != http.StatusOK || !strings.Contains(readiness.Body.String(), `"status":"HEALTHY"`) {
		t.Fatalf("readiness did not establish healthy state status=%d body=%s", readiness.Code, readiness.Body.String())
	}

	health := httptest.NewRecorder()
	handler.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/identity/health", nil))
	if health.Code != http.StatusOK || !strings.Contains(health.Body.String(), `"status":"HEALTHY"`) {
		t.Fatalf("health did not reflect successful readiness status=%d body=%s", health.Code, health.Body.String())
	}

	read := httptest.NewRecorder()
	handler.ServeHTTP(read, httptest.NewRequest(http.MethodGet, "/auth/session", nil))
	if read.Code != http.StatusNoContent || nextCalls != 1 {
		t.Fatalf("safe identity read was not delegated status=%d calls=%d", read.Code, nextCalls)
	}

	mutation := httptest.NewRecorder()
	handler.ServeHTTP(mutation, httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{}`)))
	if mutation.Code != http.StatusNoContent || nextCalls != 2 {
		t.Fatalf("ready identity mutation was not delegated status=%d calls=%d body=%s", mutation.Code, nextCalls, mutation.Body.String())
	}

	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", "")
	blocked := httptest.NewRecorder()
	handler.ServeHTTP(blocked, httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{}`)))
	if blocked.Code != http.StatusServiceUnavailable || nextCalls != 2 {
		t.Fatalf("not-ready identity mutation was not blocked status=%d calls=%d body=%s", blocked.Code, nextCalls, blocked.Body.String())
	}
}
