package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProvidersAuthAcceptsIdentityTenant(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-1", TenantID: "tenant-main", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-1")
	if err != nil || identity.TenantID != "tenant-main" {
		t.Fatalf("identity tenant was rejected identity=%#v err=%v", identity, err)
	}
}

func TestProvidersAuthAcceptsSessionTenantInsteadOfProcessDefault(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-2", TenantID: "tenant-other", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-2")
	if err != nil || identity.TenantID != "tenant-other" {
		t.Fatalf("session tenant must remain authoritative identity=%#v err=%v", identity, err)
	}
}

func TestProvidersAuthRejectsSessionWithoutTenant(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-3", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-3"); err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated, got %v", err)
	}
}

func TestProvidersAuthDoesNotDependOnProcessTenantConfiguration(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-4", TenantID: "tenant-four", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-4"); err != nil {
		t.Fatalf("valid tenant session depends on process tenant configuration: %v", err)
	}
}
