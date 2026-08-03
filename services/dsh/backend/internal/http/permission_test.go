package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

func fakeIdentityServer(t *testing.T, handler http.HandlerFunc) *protectedStoreServer {
	t.Helper()
	identityServer := httptest.NewServer(handler)
	t.Cleanup(identityServer.Close)
	return &protectedStoreServer{identity: auth.NewClient(identityServer.URL)}
}

func TestRequirePermissionAllowsExactIdentityPermission(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "operator-1",
			OperatorContextID: "operator-context-1",
			PhoneE164:         "+967700000001",
			Roles:             []string{"employee"},
			AuthState:         "authenticated",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: FinancePermissionRead, Scope: "all"},
			},
		})
	})

	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/finance", nil)
	request.Header.Set("Authorization", "Bearer operator-token")
	response := httptest.NewRecorder()
	actor, ok := s.requirePermission(response, request, "control-panel", FinancePermissionRead)
	if !ok {
		t.Fatalf("exact permission rejected with status %d body=%s", response.Code, response.Body.String())
	}
	if actor.ID != "operator-1" || actor.OperatorContextID != "operator-context-1" {
		t.Fatalf("unexpected actor %#v", actor)
	}
}

func TestRequirePermissionRejectsWrongServiceSurfaceOrAction(t *testing.T) {
	tests := []struct {
		name       string
		permission auth.Permission
	}{
		{name: "wrong service", permission: auth.Permission{Service: "wlt", Surface: "control-panel", Action: FinancePermissionRead, Scope: "all"}},
		{name: "wrong surface", permission: auth.Permission{Service: "dsh", Surface: "app-partner", Action: FinancePermissionRead, Scope: "all"}},
		{name: "wrong action", permission: auth.Permission{Service: "dsh", Surface: "control-panel", Action: FinancePermissionManage, Scope: "all"}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(auth.Identity{
					Subject: "operator-1", OperatorContextID: "operator-context-1",
					Roles: []string{"employee"}, AuthState: "authenticated",
					Permissions: []auth.Permission{tc.permission},
				})
			})
			request := httptest.NewRequest(http.MethodGet, "/dsh/operator/finance", nil)
			request.Header.Set("Authorization", "Bearer operator-token")
			response := httptest.NewRecorder()
			if _, ok := s.requirePermission(response, request, "control-panel", FinancePermissionRead); ok {
				t.Fatal("mismatched permission was accepted")
			}
			if response.Code != http.StatusForbidden {
				t.Fatalf("expected 403, got %d", response.Code)
			}
		})
	}
}

func TestRequirePermissionRejectsRoleOnlyAuthority(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject: "operator-1", OperatorContextID: "operator-context-1",
			Roles: []string{"operator", "employee", "permission:" + FinancePermissionRead},
			AuthState: "authenticated",
		})
	})
	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/finance", nil)
	request.Header.Set("Authorization", "Bearer operator-token")
	response := httptest.NewRecorder()
	if _, ok := s.requirePermission(response, request, "control-panel", FinancePermissionRead); ok {
		t.Fatal("role text granted permission without an Identity permission entry")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", response.Code)
	}
}

func TestRequirePermissionRejectsUnauthenticatedAndUnavailableIdentity(t *testing.T) {
	t.Run("unauthenticated", func(t *testing.T) {
		s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unauthenticated", http.StatusUnauthorized)
		})
		request := httptest.NewRequest(http.MethodGet, "/dsh/operator/finance", nil)
		response := httptest.NewRecorder()
		if _, ok := s.requirePermission(response, request, "control-panel", FinancePermissionRead); ok {
			t.Fatal("unauthenticated request was accepted")
		}
		if response.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", response.Code)
		}
	})

	t.Run("identity unavailable", func(t *testing.T) {
		s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "unavailable", http.StatusServiceUnavailable)
		})
		request := httptest.NewRequest(http.MethodGet, "/dsh/operator/finance", nil)
		request.Header.Set("Authorization", "Bearer operator-token")
		response := httptest.NewRecorder()
		if _, ok := s.requirePermission(response, request, "control-panel", FinancePermissionRead); ok {
			t.Fatal("identity failure was accepted")
		}
		if response.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503, got %d", response.Code)
		}
	})
}

func TestKnownDshPermissionsAreGrantedExactly(t *testing.T) {
	permissions := []string{
		FinancePermissionRead,
		FinancePermissionManage,
		PartnersPermissionRead,
		PartnersPermissionManage,
		PartnersPermissionActivate,
		OperationsPermissionRead,
		OperationsPermissionManage,
		MarketingPermissionRead,
		MarketingPermissionManage,
		SupportPermissionRead,
		SupportPermissionManage,
		DshDispatchCapacityPermissionManage,
	}
	for _, action := range permissions {
		t.Run(action, func(t *testing.T) {
			s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(auth.Identity{
					Subject: "operator-1", OperatorContextID: "operator-context-1",
					AuthState: "authenticated",
					Permissions: []auth.Permission{{Service: "dsh", Surface: "control-panel", Action: action, Scope: "all"}},
				})
			})
			request := httptest.NewRequest(http.MethodGet, "/dsh/operator/test", nil)
			request.Header.Set("Authorization", "Bearer operator-token")
			response := httptest.NewRecorder()
			if _, ok := s.requirePermission(response, request, "control-panel", action); !ok {
				t.Fatalf("permission %s rejected with status %d", action, response.Code)
			}
		})
	}
}
