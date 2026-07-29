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
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "tenant-main")
}

func TestSaaSOperatorContextAcceptsIdentityOwnedTenant(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	ok := enforceSaasOperatorContext(response, request, auth.Identity{
		Subject:  "operator-1",
		OperatorContextID: "tenant-main",
	})

	if !ok || response.Code != 200 {
		t.Fatalf("expected trusted tenant context, got ok=%v status=%d body=%s", ok, response.Code, response.Body.String())
	}
}

func TestSaaSOperatorContextRejectsMissingIdentityTenant(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceSaasOperatorContext(response, request, auth.Identity{Subject: "operator-1"}) {
		t.Fatal("expected missing identity tenant to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOperatorContextRejectsCrossOperatorContextIdentity(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceSaasOperatorContext(response, request, auth.Identity{Subject: "operator-1", OperatorContextID: "tenant-other"}) {
		t.Fatal("expected cross-tenant identity to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOperatorContextRejectsClientTenantOverride(t *testing.T) {
	configureActiveSaaS(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	request.Header.Set("X-Operator-Context-ID", "tenant-other")
	response := httptest.NewRecorder()

	if enforceSaasOperatorContext(response, request, auth.Identity{Subject: "operator-1", OperatorContextID: "tenant-main"}) {
		t.Fatal("expected client tenant override to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "UNTRUSTED_OPERATOR_CONTEXT") {
		t.Fatalf("expected UNTRUSTED_OPERATOR_CONTEXT, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestDeferredSaaSDoesNotRequireOperatorContext(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "blocked")
	t.Setenv("BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED", "false")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if !enforceSaasOperatorContext(response, request, auth.Identity{Subject: "operator-1"}) {
		t.Fatalf("expected deferred SaaS to preserve non-tenant runtime, got status=%d body=%s", response.Code, response.Body.String())
	}
}
