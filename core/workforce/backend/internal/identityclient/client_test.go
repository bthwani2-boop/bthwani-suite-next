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
		if got := r.Header.Get("X-Operator-Context-ID"); got != "tenant-main" {
			t.Fatalf("unexpected tenant %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{{
			ActorID: "field-1", Username: "ali", PhoneE164: "+967770000001",
			Roles: []string{"field"}, Active: true,
		}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "tenant-main")
	actors, err := client.SearchActors(context.Background(), "field", "ali")
	if err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
	if len(actors) != 1 || actors[0].ActorID != "field-1" {
		t.Fatalf("unexpected actors %#v", actors)
	}
}

func TestClientSendsTrustedTenantToEveryIdentityCall(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "tenant-main" {
			t.Fatalf("expected tenant-main, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "tenant-main")
	if _, err := client.SearchActors(context.Background(), "field", ""); err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
}

func TestProvisionUsesTrustedTenantInHeaderAndBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "tenant-main" {
			t.Fatalf("expected tenant-main header, got %q", got)
		}
		var input ProvisionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode provision body: %v", err)
		}
		if input.OperatorContextID != "tenant-main" {
			t.Fatalf("expected tenant-main body, got %q", input.OperatorContextID)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ActorView{ActorID: "field-1"})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "tenant-main")
	if _, err := client.Provision(context.Background(), ProvisionInput{
		Username: "field-1", PhoneE164: "+967770000001", Role: "field",
	}); err != nil {
		t.Fatalf("Provision returned error: %v", err)
	}
}

func TestProvisionRejectsTenantOverrideBeforeNetwork(t *testing.T) {
	client := NewClient("https://identity.internal", "service-token", "tenant-main")

	_, err := client.Provision(context.Background(), ProvisionInput{OperatorContextID: "tenant-other"})
	if !errors.Is(err, ErrTenantForbidden) {
		t.Fatalf("expected ErrTenantForbidden, got %v", err)
	}
}

func TestClientFailsClosedWithoutRuntimeTenant(t *testing.T) {
	client := NewClient("https://identity.internal", "service-token", "")
	if client.Configured() {
		t.Fatal("expected identity client without tenant to be unconfigured")
	}
}
