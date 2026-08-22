package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWorkforceAuthAcceptsIdentityOwnedContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-1", OperatorContextID: "context-main", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-1"); err != nil {
		t.Fatalf("matching operator context was rejected: %v", err)
	}
}

func TestWorkforceAuthAcceptsAnotherIdentityOwnedContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "operator-2", OperatorContextID: "context-other", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	if identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-2"); err != nil || identity.OperatorContextID != "context-other" {
		t.Fatalf("expected Identity-owned context, identity=%#v err=%v", identity, err)
	}
}

func TestWorkforceAuthFailsClosedWithoutIdentityContext(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{Subject: "operator-1", AuthState: "authenticated"})
	}))
	defer server.Close()
	if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token-1"); err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated, got %v", err)
	}
}
