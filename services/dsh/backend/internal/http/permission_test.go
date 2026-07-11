package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

// fakeIdentityServer stands in for Identity's /auth/session endpoint,
// letting requirePermission/requireCatalogPermission be tested end-to-end
// (real HTTP round trip through auth.Client) without a live Identity
// deployment or a DSH database.
func fakeIdentityServer(t *testing.T, respond func(w http.ResponseWriter, r *http.Request)) *protectedStoreServer {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(respond))
	t.Cleanup(server.Close)
	return &protectedStoreServer{identity: auth.NewClient(server.URL)}
}

func TestRequireCatalogPermissionRejectsNoAuth(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("identity should not be called without a bearer token")
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/catalog/policies", nil)
	rec := httptest.NewRecorder()

	_, ok := s.requireCatalogPermission(rec, req, CatalogPermissionPolicyRead, "operator")
	if ok {
		t.Fatal("expected requireCatalogPermission to reject a request with no Authorization header")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireCatalogPermissionRejectsForgedToken(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		// Simulates Identity's real behavior post-WP1: any token it does not
		// recognize (including a forged dev-bypass-* token) is unauthenticated.
		w.WriteHeader(http.StatusUnauthorized)
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/catalog/policies", nil)
	req.Header.Set("Authorization", "Bearer dev-bypass-operator-anything")
	rec := httptest.NewRecorder()

	_, ok := s.requireCatalogPermission(rec, req, CatalogPermissionPolicyRead, "operator")
	if ok {
		t.Fatal("expected requireCatalogPermission to reject a forged dev-bypass token")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireCatalogPermissionRejectsWrongPermission(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "field-1",
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "app-field", Action: "store:read", Scope: "assigned"},
			},
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/catalog/policies", nil)
	req.Header.Set("Authorization", "Bearer valid-field-token")
	rec := httptest.NewRecorder()

	_, ok := s.requireCatalogPermission(rec, req, CatalogPermissionPolicyRead, "operator")
	if ok {
		t.Fatal("expected requireCatalogPermission to reject an authenticated actor without the required permission")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestRequireCatalogPermissionAcceptsOperatorRoleFallback(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "operator-1",
			TenantID:  "dsh",
			Roles:     []string{"operator"},
			AuthState: "authenticated",
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/catalog/policies", nil)
	req.Header.Set("Authorization", "Bearer valid-operator-token")
	rec := httptest.NewRecorder()

	actor, ok := s.requireCatalogPermission(rec, req, CatalogPermissionPolicyRead, "operator")
	if !ok {
		t.Fatalf("expected operator role to satisfy the permission fallback, got status %d", rec.Code)
	}
	if actor.ID != "operator-1" {
		t.Fatalf("unexpected actor id: %q", actor.ID)
	}
}

func TestRequireCatalogPermissionAcceptsFineGrainedGrant(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "media-reviewer-1",
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: CatalogPermissionMediaReview, Scope: "all"},
			},
		})
	})

	req := httptest.NewRequest(http.MethodPost, "/dsh/operator/catalog/assets/asset-1/review", nil)
	req.Header.Set("Authorization", "Bearer valid-media-reviewer-token")
	rec := httptest.NewRecorder()

	actor, ok := s.requireCatalogPermission(rec, req, CatalogPermissionMediaReview, "operator")
	if !ok {
		t.Fatalf("expected fine-grained permission grant to succeed, got status %d", rec.Code)
	}
	if actor.ID != "media-reviewer-1" {
		t.Fatalf("unexpected actor id: %q", actor.ID)
	}
}

func TestRequireCatalogPermissionRejectsStaleCentralCatalogSurface(t *testing.T) {
	// Regression guard for the resolved surface mismatch: a permission still
	// tagged with the old, non-contract "central-catalog" surface must not
	// grant access now that the check targets "control-panel".
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "stale-grant-1",
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "central-catalog", Action: CatalogPermissionMediaReview, Scope: "all"},
			},
		})
	})

	req := httptest.NewRequest(http.MethodPost, "/dsh/operator/catalog/assets/asset-1/review", nil)
	req.Header.Set("Authorization", "Bearer valid-stale-token")
	rec := httptest.NewRecorder()

	_, ok := s.requireCatalogPermission(rec, req, CatalogPermissionMediaReview, "operator")
	if ok {
		t.Fatal("expected a permission grant on the stale central-catalog surface to be rejected")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}
