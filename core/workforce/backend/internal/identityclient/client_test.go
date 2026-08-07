package identityclient

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSearchActorsDecodesGovernedPageAndSendsServiceIdentity(t *testing.T) {
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
		if r.URL.Query().Get("limit") != "100" {
			t.Fatalf("missing pagination query: %s", r.URL.RawQuery)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ActorSearchPage{Items: []ActorView{{
			ActorID: "field-1", Username: "ali", PhoneE164: "+967770000001",
			Roles: []string{"field"}, Status: "ACTIVE",
		}}, Limit: 100, NextCursor: "abc", Total: 1})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "context-main")
	actors, nextCursor, err := client.SearchActors(context.Background(), "field", "ali", "")
	if err != nil {
		t.Fatalf("SearchActors returned error: %v", err)
	}
	if len(actors) != 1 || actors[0].ActorID != "field-1" {
		t.Fatalf("unexpected actors %#v", actors)
	}
	if !actors[0].IsActive() {
		t.Fatalf("expected canonical ACTIVE status to be active, got %#v", actors[0])
	}
	if nextCursor != "abc" {
		t.Fatalf("unexpected next cursor %q", nextCursor)
	}
}

func TestClientSendsTrustedContextToEveryIdentityCall(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Operator-Context-ID"); got != "context-main" {
			t.Fatalf("expected context-main, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ActorSearchPage{Items: []ActorView{}, Limit: 100})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token", "context-main")
	if _, _, err := client.SearchActors(context.Background(), "field", "", ""); err != nil {
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

func TestLifecycleMutationsSendGovernedRequestBody(t *testing.T) {
	tests := []struct {
		name string
		path string
		call func(*Client) error
	}{
		{
			name: "deactivate",
			path: "/internal/actors/field-1/deactivate",
			call: func(client *Client) error {
				return client.Deactivate(context.Background(), "field-1", "operator-1", "policy breach", "correlation-1")
			},
		},
		{
			name: "reactivate",
			path: "/internal/actors/field-1/reactivate",
			call: func(client *Client) error {
				return client.Reactivate(context.Background(), "field-1", "operator-1", "review complete", "correlation-2")
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != http.MethodPost || r.URL.Path != test.path {
					t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
				}
				if got := r.Header.Get("Content-Type"); got != "application/json" {
					t.Fatalf("expected application/json, got %q", got)
				}
				var body map[string]string
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Fatalf("decode lifecycle body: %v", err)
				}
				if body["requestedByActorId"] != "operator-1" || body["reason"] == "" || body["correlationId"] == "" {
					t.Fatalf("unexpected lifecycle body %#v", body)
				}
				w.WriteHeader(http.StatusNoContent)
			}))
			defer server.Close()

			client := NewClient(server.URL, "service-token", "context-main")
			if err := test.call(client); err != nil {
				t.Fatalf("lifecycle mutation returned error: %v", err)
			}
		})
	}
}
