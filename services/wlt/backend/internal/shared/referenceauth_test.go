package shared

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureReferenceSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "service-token")
}

func referenceRequest() *http.Request {
	return httptest.NewRequest(http.MethodGet, "/wlt/references/payment-status?orderId=order-1", nil)
}

func TestReferenceReaderAcceptsTrustedDshService(t *testing.T) {
	configureReferenceSaaS(t)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer service-token")
	request.Header.Set("X-Service-Caller", "dsh")
	request.Header.Set("X-Tenant-ID", "tenant-main")
	response := httptest.NewRecorder()

	if !RequireReferenceReader(response, request) {
		t.Fatalf("trusted DSH reference read was rejected status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderAcceptsMatchingIdentitySession(t *testing.T) {
	configureReferenceSaaS(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer user-token" {
			t.Fatalf("unexpected identity authorization %q", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-1", TenantID: "tenant-main", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	response := httptest.NewRecorder()

	if !RequireReferenceReader(response, request) {
		t.Fatalf("matching Identity session was rejected status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderRejectsCrossTenantIdentityDespiteClientHeader(t *testing.T) {
	configureReferenceSaaS(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-2", TenantID: "tenant-other", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer cross-token")
	request.Header.Set("X-Tenant-ID", "tenant-main")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("cross-tenant Identity session was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderRejectsMissingIdentitySession(t *testing.T) {
	configureReferenceSaaS(t)
	t.Setenv("IDENTITY_API_BASE_URL", "")
	request := referenceRequest()
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("unauthenticated reference read was accepted")
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_UNAVAILABLE") {
		t.Fatalf("expected IDENTITY_UNAVAILABLE, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderFailsClosedWithoutRuntimeTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, referenceRequest()) {
		t.Fatal("active SaaS reference read without runtime tenant was accepted")
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "SAAS_TENANT_NOT_CONFIGURED") {
		t.Fatalf("expected SAAS_TENANT_NOT_CONFIGURED, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderPreservesDeferredCompatibility(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	response := httptest.NewRecorder()
	if !RequireReferenceReader(response, referenceRequest()) {
		t.Fatalf("deferred reference read was rejected status=%d body=%s", response.Code, response.Body.String())
	}
}
