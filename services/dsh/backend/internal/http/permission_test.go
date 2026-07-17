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

func TestRequirePermissionAcrossDomains(t *testing.T) {
	// Proves the WP7 rollout: every domain migrated off plain requireActor
	// enforces its own permission action, not just the catalog domain.
	cases := []struct {
		name       string
		action     string
		fallback   string
		grantedFor string
	}{
		{"marketing", MarketingPermissionManage, "operator", MarketingPermissionManage},
		{"administration", AdministrationPermissionRead, "operator", AdministrationPermissionRead},
		{"analytics", AnalyticsPermissionRead, "operator", AnalyticsPermissionRead},
		{"finance", FinancePermissionRead, "operator", FinancePermissionRead},
		{"finance-manage", FinancePermissionManage, "operator", FinancePermissionManage},
		{"support", SupportPermissionManage, "operator", SupportPermissionManage},
		{"platform", PlatformPermissionManage, "operator", PlatformPermissionManage},
		{"operations", OperationsPermissionManage, "operator", OperationsPermissionManage},
		{"partners", PartnersPermissionActivate, "operator", PartnersPermissionActivate},
	}

	for _, tc := range cases {
		t.Run(tc.name+"/wrong permission is 403", func(t *testing.T) {
			s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(auth.Identity{
					Subject:   "actor-1",
					TenantID:  "dsh",
					Roles:     []string{"field"},
					AuthState: "authenticated",
					Permissions: []auth.Permission{
						{Service: "dsh", Surface: "control-panel", Action: "unrelated.action", Scope: "all"},
					},
				})
			})
			req := httptest.NewRequest(http.MethodGet, "/dsh/operator/x", nil)
			req.Header.Set("Authorization", "Bearer valid-token")
			rec := httptest.NewRecorder()

			_, ok := s.requirePermission(rec, req, "control-panel", tc.action, tc.fallback)
			if ok {
				t.Fatalf("%s: expected rejection for actor lacking %q", tc.name, tc.action)
			}
			if rec.Code != http.StatusForbidden {
				t.Fatalf("%s: expected 403, got %d", tc.name, rec.Code)
			}
		})

		t.Run(tc.name+"/fine-grained grant succeeds", func(t *testing.T) {
			s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(auth.Identity{
					Subject:   "actor-1",
					TenantID:  "dsh",
					Roles:     []string{"field"},
					AuthState: "authenticated",
					Permissions: []auth.Permission{
						{Service: "dsh", Surface: "control-panel", Action: tc.grantedFor, Scope: "all"},
					},
				})
			})
			req := httptest.NewRequest(http.MethodGet, "/dsh/operator/x", nil)
			req.Header.Set("Authorization", "Bearer valid-token")
			rec := httptest.NewRecorder()

			_, ok := s.requirePermission(rec, req, "control-panel", tc.action, tc.fallback)
			if !ok {
				t.Fatalf("%s: expected fine-grained grant to succeed, got status %d", tc.name, rec.Code)
			}
		})
	}
}

// TestFinanceApproveReject_RequireManageNotRead is a regression guard for the
// gap where payout approve/reject shared FinancePermissionRead with every
// other read-only finance route -- an actor granted only finance.read must
// not be able to approve or reject a payout.
func TestFinanceApproveReject_RequireManageNotRead(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "finance-reader-1",
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: FinancePermissionRead, Scope: "all"},
			},
		})
	})

	req := httptest.NewRequest(http.MethodPost, "/dsh/control-panel/finance/payout-requests/payout-1/approve", nil)
	req.Header.Set("Authorization", "Bearer valid-finance-read-token")
	rec := httptest.NewRecorder()

	_, ok := s.requirePermission(rec, req, "control-panel", FinancePermissionManage, "operator")
	if ok {
		t.Fatal("expected an actor with only finance.read to be rejected from a finance.manage action")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

// TestSpecialRequestsPermission_SupportGrantInsufficient is a regression
// guard for the resolved wrong-owner gap where special-requests operator
// endpoints (list/get/transition/dispatch) were gated on support.read/
// support.manage instead of their own operations.special_requests.*
// permissions -- an actor granted only support.manage must not be able to
// dispatch a special request, since dispatch is an Operations decision, not
// a Support-ticket decision.
func TestSpecialRequestsPermission_SupportGrantInsufficient(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "support-agent-1",
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: SupportPermissionManage, Scope: "all"},
			},
		})
	})

	req := httptest.NewRequest(http.MethodPost, "/dsh/operator/special-requests/req-1/dispatch", nil)
	req.Header.Set("Authorization", "Bearer valid-support-token")
	rec := httptest.NewRecorder()

	_, ok := s.requirePermission(rec, req, "control-panel", OperationsSpecialRequestsPermissionDispatch, "operator")
	if ok {
		t.Fatal("expected an actor with only support.manage to be rejected from operations.special_requests.dispatch")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

// TestSpecialRequestsPermission_OperationsGrantSucceeds is the positive
// counterpart: an actor holding the correct operations.special_requests.*
// grant must be able to reach the endpoint.
func TestSpecialRequestsPermission_OperationsGrantSucceeds(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   "ops-agent-1",
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: OperationsSpecialRequestsPermissionDispatch, Scope: "all"},
			},
		})
	})

	req := httptest.NewRequest(http.MethodPost, "/dsh/operator/special-requests/req-1/dispatch", nil)
	req.Header.Set("Authorization", "Bearer valid-ops-token")
	rec := httptest.NewRecorder()

	actor, ok := s.requirePermission(rec, req, "control-panel", OperationsSpecialRequestsPermissionDispatch, "operator")
	if !ok {
		t.Fatalf("expected operations.special_requests.dispatch grant to succeed, got status %d", rec.Code)
	}
	if actor.ID != "ops-agent-1" {
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
