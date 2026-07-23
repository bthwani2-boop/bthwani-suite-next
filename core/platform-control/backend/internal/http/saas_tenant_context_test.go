package http

import (
	"net/http/httptest"
	"strings"
	"testing"

	"platform-control-api/internal/auth"
)

func configureActiveSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "false")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
}

func TestSaaSTenantContextAcceptsIdentityOwnedTenant(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	ok := enforceSaasTenantContext(response, request, auth.Identity{
		Subject:  "operator-1",
		TenantID: "tenant-main",
	})

	if !ok || response.Code != 200 {
		t.Fatalf("expected trusted tenant context, got ok=%v status=%d body=%s", ok, response.Code, response.Body.String())
	}
}

func TestSaaSTenantContextRejectsMissingIdentityTenant(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceSaasTenantContext(response, request, auth.Identity{Subject: "operator-1"}) {
		t.Fatal("expected missing identity tenant to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_REQUIRED") {
		t.Fatalf("expected TENANT_CONTEXT_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSTenantContextRejectsCrossTenantIdentity(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceSaasTenantContext(response, request, auth.Identity{Subject: "operator-1", TenantID: "tenant-other"}) {
		t.Fatal("expected cross-tenant identity to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSTenantContextRejectsClientTenantOverride(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	request.Header.Set("X-Tenant-ID", "tenant-other")
	response := httptest.NewRecorder()

	if enforceSaasTenantContext(response, request, auth.Identity{Subject: "operator-1", TenantID: "tenant-main"}) {
		t.Fatal("expected client tenant override to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "UNTRUSTED_TENANT_CONTEXT") {
		t.Fatalf("expected UNTRUSTED_TENANT_CONTEXT, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestDeferredSaaSDoesNotRequireTenantContext(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "blocked")
	t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "false")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if !enforceSaasTenantContext(response, request, auth.Identity{Subject: "operator-1"}) {
		t.Fatalf("expected deferred SaaS to preserve non-tenant runtime, got status=%d body=%s", response.Code, response.Body.String())
	}
}
