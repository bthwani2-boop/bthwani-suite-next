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
		if got := r.Header.Get("X-Operator-Context-ID"); got != "context-main" {
			t.Fatalf("unexpected operator context %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{{
			ActorID: "field-1", Username: "ali", PhoneE164: "+967770000001",
			Roles: []string{"field"}, Active: true,
		}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "context-main")
	actors, err := client.SearchActors(context.Background(), "field", "ali")
	if err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
	if len(actors) != 1 || actors[0].ActorID != "field-1" {
		t.Fatalf("unexpected actors %#v", actors)
	}
}

func TestClientSendsTrustedContextToEveryIdentityCall(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "context-main" {
			t.Fatalf("expected context-main, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]ActorView{})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "context-main")
	if _, err := client.SearchActors(context.Background(), "field", ""); err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
}

func TestProvisionUsesTrustedContextInHeaderAndBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "context-main" {
			t.Fatalf("expected context-main header, got %q", got)
		}
		var input ProvisionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("decode provision body: %v", err)
		}
		if input.OperatorContextID != "context-main" {
			t.Fatalf("expected context-main body, got %q", input.OperatorContextID)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ActorView{ActorID: "field-1"})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "context-main")
	if _, err := client.Provision(context.Background(), ProvisionInput{
		Username: "field-1", PhoneE164: "+967770000001", Role: "field",
	}); err != nil {
		t.Fatalf("Provision returned error: %v", err)
	}
}

func TestProvisionRejectsOperatorContextOverrideBeforeNetwork(t *testing.T) {
	client := NewClient("https://identity.internal", "service-token", "operator-context-main")

	_, err := client.Provision(context.Background(), ProvisionInput{OperatorContextID: "operator-context-other"})
	if !errors.Is(err, ErrOperatorContextForbidden) {
		t.Fatalf("expected ErrOperatorContextForbidden, got %v", err)
	}
}

func TestClientFailsClosedWithoutRuntimeContext(t *testing.T) {
	client := NewClient("https://identity.internal", "service-token", "")
	if client.Configured() {
		t.Fatal("expected identity client without operator context to be unconfigured")
	}
}
