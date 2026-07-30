package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProvidersAuthAcceptsIdentityOperatorContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-1", OperatorContextID: "context-main", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-1")
	if err != nil || identity.OperatorContextID != "context-main" {
		t.Fatalf("identity operator context was rejected identity=%#v err=%v", identity, err)
	}
}

func TestProvidersAuthAcceptsSessionOperatorContextInsteadOfProcessDefault(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "context-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-2", OperatorContextID: "context-other", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-2")
	if err != nil || identity.OperatorContextID != "context-other" {
		t.Fatalf("session operator context must remain authoritative identity=%#v err=%v", identity, err)
	}
}

func TestProvidersAuthRejectsSessionWithoutOperatorContext(t *testing.T) {
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

func TestProvidersAuthDoesNotDependOnProcessOperatorContextConfiguration(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-4", OperatorContextID: "context-four", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-4"); err != nil {
		t.Fatalf("valid operator context session depends on process operator context configuration: %v", err)
	}
}
