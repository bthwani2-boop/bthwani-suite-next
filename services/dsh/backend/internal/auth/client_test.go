package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestResolveRejectsWhenBaseURLEmpty(t *testing.T) {
	c := NewClient("")
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrIdentityUnavailable {
		t.Fatalf("expected ErrIdentityUnavailable for empty baseURL, got %v", err)
	}
}

func TestResolveRejectsMissingBearerPrefix(t *testing.T) {
	c := NewClient("https://identity.internal")
	cases := []string{"", "token-1", "Basic token-1", "bearer token-1"}
	for _, authz := range cases {
		_, err := c.Resolve(context.Background(), authz)
		if err != ErrUnauthenticated {
			t.Fatalf("expected ErrUnauthenticated for authorization=%q, got %v", authz, err)
		}
	}
}

func TestResolveSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer good-token" {
			t.Fatalf("expected Authorization header to be forwarded, got %q", r.Header.Get("Authorization"))
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Identity{
			Subject:   "user-1",
			TenantID:  "dsh",
			Roles:     []string{"client"},
			AuthState: "authenticated",
		})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	identity, err := c.Resolve(context.Background(), "Bearer good-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if identity.Subject != "user-1" {
		t.Fatalf("expected subject=user-1, got %q", identity.Subject)
	}
	if !identity.HasRole("client") {
		t.Fatalf("expected identity to have role client")
	}
	if identity.HasRole("operator") {
		t.Fatalf("expected identity to not have role operator")
	}
}

func TestResolveUnauthorizedStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer bad-token")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for HTTP 401, got %v", err)
	}
}

func TestResolveOtherErrorStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrIdentityUnavailable {
		t.Fatalf("expected ErrIdentityUnavailable for HTTP 500, got %v", err)
	}
}

func TestResolveRejectsUnauthenticatedState(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Identity{Subject: "user-1", AuthState: "pending"})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for non-authenticated state, got %v", err)
	}
}

func TestResolveRejectsMissingSubject(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Identity{AuthState: "authenticated"})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for missing subject, got %v", err)
	}
}

func TestHasRoleFalseWhenNoRoles(t *testing.T) {
	identity := Identity{}
	if identity.HasRole("client") {
		t.Fatalf("expected false for identity with no roles")
	}
}
