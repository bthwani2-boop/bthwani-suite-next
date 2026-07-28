package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/partner"
)

func identitySessionServer(t *testing.T, identity auth.Identity) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/session" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(identity)
	}))
	t.Cleanup(server.Close)
	return server
}

func TestTrustedPartnerTenantComesFromIdentity(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-a")
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:   "operator-a",
		TenantID:  "tenant-a",
		Roles:     []string{"operator"},
		AuthState: "authenticated",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil)

	called := false
	handler := protected.withTrustedPartnerTenant(func(w http.ResponseWriter, r *http.Request) {
		called = true
		tenantID, ok := partner.TenantIDFromContext(r.Context())
		if !ok || tenantID != "tenant-a" {
			t.Fatalf("trusted tenant = %q, ok=%v", tenantID, ok)
		}
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/partners?tenantId=spoofed", nil)
	req.Header.Set("Authorization", "Bearer test-session")
	req.Header.Set("X-Tenant-ID", "spoofed")
	res := httptest.NewRecorder()
	handler(res, req)

	if !called || res.Code != http.StatusNoContent {
		t.Fatalf("trusted tenant boundary returned status=%d called=%v body=%s", res.Code, called, res.Body.String())
	}
}

func TestTrustedPartnerTenantRejectsIdentityWithoutTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "inactive")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:   "operator-without-tenant",
		Roles:     []string{"operator"},
		AuthState: "authenticated",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil)

	called := false
	handler := protected.withTrustedPartnerTenant(func(http.ResponseWriter, *http.Request) { called = true })
	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/partners", nil)
	req.Header.Set("Authorization", "Bearer test-session")
	req.Header.Set("X-Tenant-ID", "spoofed-tenant")
	res := httptest.NewRecorder()
	handler(res, req)

	if called {
		t.Fatal("request without Identity tenant reached the protected handler")
	}
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d want=%d body=%s", res.Code, http.StatusUnauthorized, res.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "UNAUTHENTICATED" {
		t.Fatalf("code=%v want UNAUTHENTICATED", body["code"])
	}
}

func TestTrustedPartnerTenantUsesIdentityTenantInsteadOfProcessDefault(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-a")
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:   "operator-b",
		TenantID:  "tenant-b",
		Roles:     []string{"operator"},
		AuthState: "authenticated",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil)

	called := false
	handler := protected.withTrustedPartnerTenant(func(w http.ResponseWriter, r *http.Request) {
		called = true
		tenantID, ok := partner.TenantIDFromContext(r.Context())
		if !ok || tenantID != "tenant-b" {
			t.Fatalf("trusted tenant = %q, ok=%v", tenantID, ok)
		}
		w.WriteHeader(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/partners", nil)
	req.Header.Set("Authorization", "Bearer test-session")
	res := httptest.NewRecorder()
	handler(res, req)

	if !called || res.Code != http.StatusNoContent {
		t.Fatalf("Identity tenant boundary status=%d called=%v body=%s", res.Code, called, res.Body.String())
	}
}
