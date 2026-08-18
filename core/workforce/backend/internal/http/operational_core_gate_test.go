package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"workforce-api/internal/auth"
)

func TestBindIdentityRequestContextUsesIdentityOwnedOperatorContext(t *testing.T) {
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer operator-token" {
			t.Fatalf("unexpected authorization header %q", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "operator-1",
			OperatorContextID: "context-main",
			AuthState:         "authenticated",
		})
	}))
	defer identityServer.Close()

	request := httptest.NewRequest(http.MethodPost, "/workforce/field-agents/field-1/activation-codes", nil)
	request.Header.Set("Authorization", "Bearer operator-token")
	boundRequest, _, bound := bindIdentityRequestContext(request, auth.NewClient(identityServer.URL))
	if !bound {
		t.Fatal("authenticated Identity context was not bound")
	}
	if got, ok := auth.OperatorContextIDFromContext(boundRequest.Context()); !ok || got != "context-main" {
		t.Fatalf("expected Identity-owned context-main, got %q (ok=%v)", got, ok)
	}
}

func TestBindIdentityRequestContextFailsClosedWithoutIdentityContext(t *testing.T) {
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "operator-1",
			AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()

	request := httptest.NewRequest(http.MethodPost, "/workforce/field-agents/field-1/activation-codes", nil)
	request.Header.Set("Authorization", "Bearer operator-token")
	boundRequest, _, bound := bindIdentityRequestContext(request, auth.NewClient(identityServer.URL))
	if bound {
		t.Fatal("request without Identity-owned context must not be bound")
	}
	if _, ok := auth.OperatorContextIDFromContext(boundRequest.Context()); ok {
		t.Fatal("caller context must not gain an operator context after failed binding")
	}
}
