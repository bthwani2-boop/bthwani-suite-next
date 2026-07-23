package identityclient

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchActorsDecodesOpenAPIArrayAndSendsServiceIdentity(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/internal/actors/search" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if got := r.URL.Query().Get("role"); got != "field" {
			t.Fatalf("unexpected role query %q", got)
		}
		if got := r.URL.Query().Get("q"); got != "ali" {
			t.Fatalf("unexpected search query %q", got)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer service-token" {
			t.Fatalf("unexpected authorization %q", got)
		}
		if got := r.Header.Get("X-Service-Caller"); got != "workforce" {
			t.Fatalf("unexpected service caller %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{{
			ActorID: "field-1", Username: "ali", PhoneE164: "+967770000001",
			Roles: []string{"field"}, Active: true,
		}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	actors, err := client.SearchActors(context.Background(), "field", "ali")
	if err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
	if len(actors) != 1 || actors[0].ActorID != "field-1" {
		t.Fatalf("unexpected actors %#v", actors)
	}
}

func TestActiveSaaSClientSendsTrustedTenantToEveryIdentityCall(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-main" {
			t.Fatalf("expected tenant-main, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	if _, err := client.SearchActors(context.Background(), "field", ""); err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
}

func TestActiveSaaSProvisionUsesTrustedTenantInHeaderAndBody(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Tenant-ID"); got != "tenant-main" {
			t.Fatalf("expected tenant-main header, got %q", got)
		}
		var input ProvisionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode provision body: %v", err)
		}
		if input.TenantID != "tenant-main" {
			t.Fatalf("expected tenant-main body, got %q", input.TenantID)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ActorView{ActorID: "field-1"})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	if _, err := client.Provision(context.Background(), ProvisionInput{
		Username: "field-1", PhoneE164: "+967770000001", Role: "field",
	}); err != nil {
		t.Fatalf("Provision returned error: %v", err)
	}
}

func TestActiveSaaSProvisionRejectsTenantOverrideBeforeNetwork(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
	client := NewClient("https://identity.internal", "service-token")

	_, err := client.Provision(context.Background(), ProvisionInput{TenantID: "tenant-other"})
	if !errors.Is(err, ErrTenantForbidden) {
		t.Fatalf("expected ErrTenantForbidden, got %v", err)
	}
}

func TestActiveSaaSClientFailsClosedWithoutRuntimeTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	client := NewClient("https://identity.internal", "service-token")
	if client.Configured() {
		t.Fatal("expected active SaaS identity client without tenant to be unconfigured")
	}
}
