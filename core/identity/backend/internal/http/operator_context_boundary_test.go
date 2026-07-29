package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureIdentityActiveSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "OperatorContext-main")
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "service-token")
}

func configureIdentityDeferredSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "eligible_for_review")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "service-token")
}

func internalActorRequest(method, path string) *http.Request {
	request := httptest.NewRequest(method, path, nil)
	request.Header.Set("Authorization", "Bearer service-token")
	request.Header.Set("X-Service-Caller", "workforce")
	return request
}

func TestActiveSaaSOperatorContextConfiguration(t *testing.T) {
	configureIdentityActiveSaaS(t)
	operatorContextID, active, err := activeSaaSOperatorContext()
	if err != nil || !active || operatorContextID != "OperatorContext-main" {
		t.Fatalf("unexpected SaaS OperatorContext state OperatorContext=%q active=%v err=%v", operatorContextID, active, err)
	}
}

func TestActiveSaaSOperatorContextConfigurationFailsClosedWithoutOperatorContext(t *testing.T) {
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	_, active, err := activeSaaSOperatorContext()
	if !active || err == nil {
		t.Fatalf("expected active invalid SaaS configuration, active=%v err=%v", active, err)
	}
}

func TestInternalOperatorContextRequestRequiresHeader(t *testing.T) {
	configureIdentityActiveSaaS(t)
	request := internalActorRequest(http.MethodGet, "/internal/actors/search")
	response := httptest.NewRecorder()

	if validateInternalOperatorContextRequest(response, request, "OperatorContext-main") {
		t.Fatal("request without X-Operator-Context-ID was accepted")
	}
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestInternalOperatorContextRequestRejectsCrossOperatorContextHeader(t *testing.T) {
	configureIdentityActiveSaaS(t)
	request := internalActorRequest(http.MethodGet, "/internal/actors/search")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-other")
	response := httptest.NewRecorder()

	if validateInternalOperatorContextRequest(response, request, "OperatorContext-main") {
		t.Fatal("cross-OperatorContext request was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestProvisionOperatorContextOverrideIsRejectedBeforeDatabaseAccess(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/provision",
		strings.NewReader(`{"username":"field-1","phoneE164":"+967770000001","role":"field","operatorContextId":"OperatorContext-other"}`),
	)
	response := httptest.NewRecorder()

	if rewriteProvisionOperatorContext(response, request, nil, "OperatorContext-main") {
		t.Fatal("cross-OperatorContext provision request was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestDeferredSaaSOperatorContextBoundaryFailsClosedWithoutOperatorContext(t *testing.T) {
	configureIdentityDeferredSaaS(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := internalActorRequest(http.MethodGet, "/internal/actors")
	response := httptest.NewRecorder()

	SaaSOperatorContextBoundary(nil, next).ServeHTTP(response, request)
	if nextCalled {
		t.Fatal("deferred SaaS request without trusted OperatorContext reached the actor router")
	}
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestDeferredSaaSOperatorContextBoundaryAcceptsTrustedServiceOperatorContext(t *testing.T) {
	configureIdentityDeferredSaaS(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		if operatorContextID := r.Header.Get("X-Operator-Context-ID"); operatorContextID != "OperatorContext-main" {
			t.Fatalf("unexpected OperatorContext header %q", operatorContextID)
		}
		w.WriteHeader(http.StatusNoContent)
	})
	request := internalActorRequest(http.MethodGet, "/internal/actors")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-main")
	response := httptest.NewRecorder()

	SaaSOperatorContextBoundary(nil, next).ServeHTTP(response, request)
	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected trusted deferred request passthrough, called=%v status=%d body=%s", nextCalled, response.Code, response.Body.String())
	}
}

func TestSaaSOperatorContextBoundaryIgnoresNonActorRoutes(t *testing.T) {
	configureIdentityActiveSaaS(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/identity/health", nil)
	response := httptest.NewRecorder()

	SaaSOperatorContextBoundary(nil, next).ServeHTTP(response, request)
	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected public route passthrough, called=%v status=%d", nextCalled, response.Code)
	}
}

func TestActorIDExtractionDoesNotTreatSearchOrProvisionAsActors(t *testing.T) {
	for _, path := range []string{
		"/internal/actors/search",
		"/internal/actors/provision",
		"/internal/actors",
	} {
		if actorID := actorIDFromInternalPath(path); actorID != "" {
			t.Fatalf("expected no actor id for %s, got %q", path, actorID)
		}
	}
	if actorID := actorIDFromInternalPath("/internal/actors/field-1/activations/latest"); actorID != "field-1" {
		t.Fatalf("expected field-1, got %q", actorID)
	}
}
