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
	for _, authorization := range cases {
		_, err := c.Resolve(context.Background(), authorization)
		if err != ErrUnauthenticated {
			t.Fatalf("expected ErrUnauthenticated for authorization=%q, got %v", authorization, err)
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
			Subject:           "user-1",
			OperatorContextID: "operator-a",
			Roles:             []string{"client"},
			AuthState:         "authenticated",
		})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	identity, err := c.Resolve(context.Background(), "Bearer good-token")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if identity.Subject != "user-1" || identity.OperatorContextID != "operator-a" {
		t.Fatalf("unexpected identity subject=%q operatorContext=%q", identity.Subject, identity.OperatorContextID)
	}
	if !identity.HasRole("client") {
		t.Fatal("expected identity to have role client")
	}
	if identity.HasRole("operator") {
		t.Fatal("expected identity to not have role operator")
	}
}

func TestResolveUnauthorizedStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer bad-token")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for HTTP 401, got %v", err)
	}
}

func TestResolveForbiddenStatusIsUnauthenticated(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer cross-context-token")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for HTTP 403, got %v", err)
	}
}

func TestResolveOtherErrorStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrIdentityUnavailable {
		t.Fatalf("expected ErrIdentityUnavailable for HTTP 500, got %v", err)
	}
}

func TestResolveRetriesTransientIdentityFailure(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestCount++
		if requestCount == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		_ = json.NewEncoder(w).Encode(Identity{
			Subject:           "user-1",
			OperatorContextID: "operator-a",
			Roles:             []string{"captain"},
			AuthState:         "authenticated",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL)
	identity, err := client.Resolve(context.Background(), "Bearer token-1")
	if err != nil {
		t.Fatalf("expected transient identity failure to be retried, got %v", err)
	}
	if identity.Subject != "user-1" || requestCount != 2 {
		t.Fatalf("unexpected retry result identity=%#v requests=%d", identity, requestCount)
	}
}

func TestResolveRejectsUnauthenticatedState(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Identity{Subject: "user-1", OperatorContextID: "operator-a", AuthState: "pending"})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for non-authenticated state, got %v", err)
	}
}

func TestResolveRejectsMissingSubject(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(Identity{OperatorContextID: "operator-a", AuthState: "authenticated"})
	}))
	defer server.Close()

	c := NewClient(server.URL)
	_, err := c.Resolve(context.Background(), "Bearer token-1")
	if err != ErrUnauthenticated {
		t.Fatalf("expected ErrUnauthenticated for missing subject, got %v", err)
	}
}

func TestResolveRejectsMissingOperatorContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{Subject: "user-1", AuthState: "authenticated"})
	}))
	defer server.Close()

	client := NewClient(server.URL)
	if _, err := client.Resolve(context.Background(), "Bearer token-1"); err != ErrUnauthenticated {
		t.Fatalf("expected session without operator context to be rejected, got %v", err)
	}
}

func TestResolveAcceptsSessionOperatorContextInsteadOfProcessDefault(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(Identity{
			Subject: "user-2", OperatorContextID: "operator-other", Roles: []string{"client"}, AuthState: "authenticated",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL)
	identity, err := client.Resolve(context.Background(), "Bearer operator-other-token")
	if err != nil || identity.OperatorContextID != "operator-other" {
		t.Fatalf("expected authenticated session operator context to remain authoritative, identity=%#v err=%v", identity, err)
	}
}

func TestHasRoleFalseWhenNoRoles(t *testing.T) {
	identity := Identity{}
	if identity.HasRole("client") {
		t.Fatal("expected false for identity with no roles")
	}
}

func TestFetchPartnerPermissionBundlesRequiresTrustedConfiguration(t *testing.T) {
	cases := []*Client{
		NewClientWithInternalAccess("", "service-token", "operator-main"),
		NewClientWithInternalAccess("https://identity.internal", "", "operator-main"),
		NewClientWithInternalAccess("https://identity.internal", "service-token", ""),
	}
	for _, client := range cases {
		if _, err := client.FetchPartnerPermissionBundles(context.Background()); err != ErrIdentityUnavailable {
			t.Fatalf("expected missing trusted configuration to fail closed, got %v", err)
		}
	}
}

func TestFetchPartnerPermissionBundlesAuthenticatesAndCachesDefensiveCopy(t *testing.T) {
	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if r.Method != http.MethodGet || r.URL.Path != "/internal/partner/permission-bundles" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer dsh-identity-secret" {
			t.Fatalf("unexpected authorization header %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("unexpected service caller %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Operator-Context-ID") != "operator-main" {
			t.Fatalf("unexpected operator context %q", r.Header.Get("X-Operator-Context-ID"))
		}
		_ = json.NewEncoder(w).Encode(partnerPermissionBundlesResponse{
			PermissionBundles: []PartnerPermissionBundleDescriptor{
				{Code: "owner", NameAr: "مالك", NameEn: "Owner", Actions: []string{"team.manage", "catalog.manage"}},
			},
		})
	}))
	defer server.Close()

	client := NewClientWithInternalAccess(server.URL, "dsh-identity-secret", "operator-main")
	first, err := client.FetchPartnerPermissionBundles(WithOperatorContext(context.Background(), "operator-main"))
	if err != nil {
		t.Fatalf("unexpected first fetch error: %v", err)
	}
	first[0].Actions[0] = "tampered"

	second, err := client.FetchPartnerPermissionBundles(WithOperatorContext(context.Background(), "operator-main"))
	if err != nil {
		t.Fatalf("unexpected cached fetch error: %v", err)
	}
	if requestCount != 1 {
		t.Fatalf("expected one Identity request, got %d", requestCount)
	}
	if second[0].Actions[0] != "team.manage" {
		t.Fatalf("caller mutated cached permission truth: %#v", second)
	}
}

func TestListActorRoleAssignmentsReadsDurableInactiveMemberships(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.EscapedPath() != "/internal/rbac/actors/actor-1/roles" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.EscapedPath())
		}
		if r.Header.Get("Authorization") != "Bearer dsh-identity-secret" {
			t.Fatalf("unexpected authorization header %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("unexpected service caller %q", r.Header.Get("X-Service-Caller"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"assignments": []RbacActorRoleAssignment{{
				ActorID:  "actor-1",
				RoleID:   "role-inactive",
				RoleName: "operations_support",
			}},
		})
	}))
	defer server.Close()

	client := NewClientWithInternalAccess(server.URL, "dsh-identity-secret", "")
	assignments, err := client.ListActorRoleAssignments(WithOperatorContext(context.Background(), "operator-main"), "actor-1")
	if err != nil {
		t.Fatalf("unexpected durable assignment read error: %v", err)
	}
	if len(assignments) != 1 || assignments[0].RoleName != "operations_support" {
		t.Fatalf("inactive durable assignment was not preserved: %#v", assignments)
	}
}

func TestRoleMutationCarriesVersionFenceAndMapsConflict(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Idempotency-Key") != "intent-1" || r.Header.Get("X-Canonical-Intent-ID") != "intent-1" {
			t.Fatalf("canonical intent headers missing: %#v", r.Header)
		}
		switch r.Method {
		case http.MethodPost:
			var payload struct {
				RoleName            string `json:"roleName"`
				ExpectedRoleVersion int    `json:"expectedRoleVersion"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode grant payload: %v", err)
			}
			if payload.RoleName != "operations_support" || payload.ExpectedRoleVersion != 7 {
				t.Fatalf("grant version fence missing: %#v", payload)
			}
			w.WriteHeader(http.StatusConflict)
			_ = json.NewEncoder(w).Encode(map[string]string{"code": "ROLE_VERSION_CONFLICT"})
		case http.MethodDelete:
			if r.URL.Query().Get("expectedRoleVersion") != "7" {
				t.Fatalf("revoke version fence missing: %s", r.URL.RawQuery)
			}
			w.WriteHeader(http.StatusConflict)
			_ = json.NewEncoder(w).Encode(map[string]string{"code": "ROLE_VERSION_CONFLICT"})
		default:
			t.Fatalf("unexpected mutation method %s", r.Method)
		}
	}))
	defer server.Close()

	client := NewClientWithInternalAccess(server.URL, "dsh-identity-secret", "")
	operatorContext := WithOperatorContext(context.Background(), "operator-main")
	if _, err := client.GrantRoleWithIdempotency(operatorContext, "actor-1", "operations_support", "reviewer-1", 7, "intent-1"); err != ErrRbacVersionConflict {
		t.Fatalf("grant conflict mapping = %v", err)
	}
	if err := client.RevokeRoleWithIdempotency(operatorContext, "actor-1", "operations_support", "reviewer-1", 7, "intent-1"); err != ErrRbacVersionConflict {
		t.Fatalf("revoke conflict mapping = %v", err)
	}
}
