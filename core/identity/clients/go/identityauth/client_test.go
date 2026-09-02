package identityauth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHasSurfacePermissionUsesCanonicalExactTuple(t *testing.T) {
	identity := ActorIdentity{Permissions: []Permission{
		{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
		{Service: "core", Surface: "*", Action: "audit:read", Scope: "*"},
	}}

	if !identity.HasSurfacePermission("dsh", "control-panel", "platform:read", "own") {
		t.Fatal("canonical all scope should cover the requested scope")
	}
	if identity.HasSurfacePermission("dsh", "app-field", "platform:read", "own") {
		t.Fatal("surface mismatch must be rejected")
	}
	if identity.HasSurfacePermission("core", "control-panel", "audit:read", "all") {
		t.Fatal("wildcard surface and scope are not canonical permissions")
	}
	if identity.HasPermission("core", "audit:read", "all") {
		t.Fatal("wildcard action and scope are not canonical permissions")
	}
}

func TestResolveRequiresAuthenticatedSubjectAndOperatorContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ActorIdentity{
			Subject: "actor-1", OperatorContextID: " context-main ", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer session-token")
	if err != nil || identity.OperatorContextID != "context-main" {
		t.Fatalf("Resolve() identity=%#v err=%v", identity, err)
	}

	badServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"authState":"authenticated","subject":"actor-1"}`))
	}))
	defer badServer.Close()
	if _, err := NewClient(badServer.URL).Resolve(context.Background(), "Bearer session-token"); !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("missing operator context error=%v", err)
	}
}

func TestResolveKeepsSessionOperatorContextAuthoritative(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "process-default-must-not-win")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(ActorIdentity{
			Subject: "actor-2", OperatorContextID: "session-context", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer session-token")
	if err != nil || identity.OperatorContextID != "session-context" {
		t.Fatalf("session operator context was not authoritative: identity=%#v err=%v", identity, err)
	}
}

func TestResolveRetriesTransientIdentityFailure(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requests++
		if requests == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		_ = json.NewEncoder(w).Encode(ActorIdentity{
			Subject: "actor-1", OperatorContextID: "context-main", AuthState: "authenticated",
		})
	}))
	defer server.Close()

	identity, err := NewClient(server.URL).Resolve(context.Background(), "Bearer [REDACTED:Bearer token]")
	if err != nil || identity.Subject != "actor-1" || requests != 2 {
		t.Fatalf("Resolve() retry identity=%#v err=%v requests=%d", identity, err, requests)
	}
}

func TestResolveMapsMalformedAndUnavailableResponses(t *testing.T) {
	for name, handler := range map[string]http.HandlerFunc{
		"malformed": func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"subject":`))
		},
		"unavailable": func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
		},
	} {
		t.Run(name, func(t *testing.T) {
			server := httptest.NewServer(handler)
			defer server.Close()
			if _, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token"); !errors.Is(err, ErrIdentityUnavailable) {
				t.Fatalf("Resolve() error=%v", err)
			}
		})
	}
}
