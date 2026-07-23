package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureIdentityActiveSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "service-token")
}

func internalActorRequest(method, path string) *http.Request {
	request := httptest.NewRequest(method, path, nil)
	request.Header.Set("Authorization", "Bearer service-token")
	request.Header.Set("X-Service-Caller", "workforce")
	return request
}

func TestActiveSaaSTenantConfiguration(t *testing.T) {
	configureIdentityActiveSaaS(t)
	tenantID, active, err := activeSaaSTenant()
	if err != nil || !active || tenantID != "tenant-main" {
		t.Fatalf("unexpected SaaS tenant state tenant=%q active=%v err=%v", tenantID, active, err)
	}
}

func TestActiveSaaSTenantConfigurationFailsClosedWithoutTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	_, active, err := activeSaaSTenant()
	if !active || err == nil {
		t.Fatalf("expected active invalid SaaS configuration, active=%v err=%v", active, err)
	}
}

func TestInternalTenantRequestRequiresHeader(t *testing.T) {
	configureIdentityActiveSaaS(t)
	request := internalActorRequest(http.MethodGet, "/internal/actors/search")
	response := httptest.NewRecorder()

	if validateInternalTenantRequest(response, request, "tenant-main") {
		t.Fatal("request without X-Tenant-ID was accepted")
	}
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_REQUIRED") {
		t.Fatalf("expected TENANT_CONTEXT_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestInternalTenantRequestRejectsCrossTenantHeader(t *testing.T) {
	configureIdentityActiveSaaS(t)
	request := internalActorRequest(http.MethodGet, "/internal/actors/search")
	request.Header.Set("X-Tenant-ID", "tenant-other")
	response := httptest.NewRecorder()

	if validateInternalTenantRequest(response, request, "tenant-main") {
		t.Fatal("cross-tenant request was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestProvisionTenantOverrideIsRejectedBeforeDatabaseAccess(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/provision",
		strings.NewReader(`{"username":"field-1","phoneE164":"+967770000001","role":"field","tenantId":"tenant-other"}`),
	)
	response := httptest.NewRecorder()

	if rewriteProvisionTenant(response, request, nil, "tenant-main") {
		t.Fatal("cross-tenant provision request was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestDeferredSaaSLeavesInternalActorRouterUnchanged(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/internal/actors/search", nil)
	response := httptest.NewRecorder()

	SaaSTenantBoundary(nil, next).ServeHTTP(response, request)
	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected deferred mode passthrough, called=%v status=%d", nextCalled, response.Code)
	}
}

func TestSaaSTenantBoundaryIgnoresNonActorRoutes(t *testing.T) {
	configureIdentityActiveSaaS(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/identity/health", nil)
	response := httptest.NewRecorder()

	SaaSTenantBoundary(nil, next).ServeHTTP(response, request)
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
