package shared

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureReferenceAuth(t *testing.T) {
	t.Helper()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "service-token")
}

func referenceRequest() *http.Request {
	return httptest.NewRequest(http.MethodGet, "/wlt/references/payment-status?orderId=order-1", nil)
}

func TestReferenceReaderAcceptsDistinctTrustedDshTenants(t *testing.T) {
	configureReferenceAuth(t)
	for _, tenantID := range []string{"tenant-a", "tenant-b"} {
		request := referenceRequest()
		request.Header.Set("Authorization", "Bearer service-token")
		request.Header.Set("X-Service-Caller", "dsh")
		request.Header.Set("X-Tenant-ID", tenantID)
		response := httptest.NewRecorder()

		if !RequireReferenceReader(response, request) {
			t.Fatalf("trusted DSH tenant %s was rejected status=%d body=%s", tenantID, response.Code, response.Body.String())
		}
		if request.Header.Get("X-Tenant-ID") != tenantID {
			t.Fatalf("trusted service tenant changed: got %q want %q", request.Header.Get("X-Tenant-ID"), tenantID)
		}
		if contextualTenant, ok := TenantIDFromContext(request.Context()); !ok || contextualTenant != tenantID {
			t.Fatalf("tenant context not installed: tenant=%q ok=%v", contextualTenant, ok)
		}
	}
}

func TestReferenceReaderRejectsTrustedDshWithoutTenant(t *testing.T) {
	configureReferenceAuth(t)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer service-token")
	request.Header.Set("X-Service-Caller", "dsh")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("trusted DSH request without tenant was accepted")
	}
}

func TestReferenceReaderAcceptsIdentityTenantAndInstallsIt(t *testing.T) {
	configureReferenceAuth(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer user-token" {
			t.Fatalf("unexpected identity authorization %q", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-1", TenantID: "tenant-a", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	response := httptest.NewRecorder()

	if !RequireReferenceReader(response, request) {
		t.Fatalf("Identity session was rejected status=%d body=%s", response.Code, response.Body.String())
	}
	if request.Header.Get("X-Tenant-ID") != "tenant-a" {
		t.Fatalf("identity tenant was not installed, got %q", request.Header.Get("X-Tenant-ID"))
	}
}

func TestReferenceReaderRejectsHeaderThatConflictsWithIdentity(t *testing.T) {
	configureReferenceAuth(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-2", TenantID: "tenant-b", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	request.Header.Set("X-Tenant-ID", "tenant-a")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("client header overrode Identity tenant")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderRejectsIdentityWithoutTenant(t *testing.T) {
	configureReferenceAuth(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-3", TenantID: "", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("Identity session without tenant was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_REQUIRED") {
		t.Fatalf("expected TENANT_CONTEXT_REQUIRED, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderRejectsMissingIdentitySession(t *testing.T) {
	configureReferenceAuth(t)
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

func TestReferenceReaderDoesNotBypassAuthInDeferredMode(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	configureReferenceAuth(t)
	request := referenceRequest()
	response := httptest.NewRecorder()
	if RequireReferenceReader(response, request) {
		t.Fatal("deferred unauthenticated reference read was accepted")
	}
}

func TestReferenceReaderAcceptsTrustedDshInDeferredMode(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	configureReferenceAuth(t)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer service-token")
	request.Header.Set("X-Service-Caller", "dsh")
	request.Header.Set("X-Tenant-ID", "tenant-deferred")
	response := httptest.NewRecorder()
	if !RequireReferenceReader(response, request) {
		t.Fatalf("deferred trusted service read rejected status=%d body=%s", response.Code, response.Body.String())
	}
}
