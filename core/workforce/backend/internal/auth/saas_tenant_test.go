package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWorkforceAuthAcceptsMatchingActiveSaaSTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-1", TenantID: "tenant-main", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-1"); err != nil {
		t.Fatalf("matching tenant was rejected: %v", err)
	}
}

func TestWorkforceAuthRejectsCrossTenantIdentity(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-2", TenantID: "tenant-other", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-2"); err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated, got %v", err)
	}
}

func TestWorkforceAuthFailsClosedWithoutActiveTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	if _, err := NewClient("https://identity.internal").Resolve(context.Background(), "Bearer token-1"); err != ErrIdentityUnavailable {
		t.Fatalf("expected ErrIdentityUnavailable, got %v", err)
	}
}
