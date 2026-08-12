package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
)

func TestEmployeeExactPermissionDoesNotCrossDshDomains(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "operations-manager-1",
			OperatorContextID: "OperatorContext-main",
			Roles:             []string{"employee", "workforce.supervise.employee"},
			AuthState:         "authenticated",
			SessionID:         "session-operations-manager-1",
			SessionSurface:    "control-panel",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: OperationsPermissionRead, Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: OperationsPermissionManage, Scope: "all"},
			},
		})
	})

	allowedRequest := httptest.NewRequest(http.MethodPost, "/dsh/operator/operations/action", nil)
	allowedRequest.Header.Set("Authorization", "Bearer operations-manager-token")
	allowedResponse := httptest.NewRecorder()
	actor, ok := s.requirePermission(
		allowedResponse,
		allowedRequest,
		"control-panel",
		OperationsPermissionManage,
	)
	if !ok {
		t.Fatalf("operations manager exact grant was rejected with status %d", allowedResponse.Code)
	}
	if actor.ID != "operations-manager-1" || actor.Role != "employee" {
		t.Fatalf("authorized actor role must remain truthful: %#v", actor)
	}
	if actor.SessionSurface != "control-panel" || actor.SessionID != "session-operations-manager-1" {
		t.Fatalf("session binding was not preserved: %#v", actor)
	}
	if actor.AuthorizedAction != OperationsPermissionManage || actor.AuthorizationScope != "all" {
		t.Fatalf("Identity permission action/scope were not preserved: %#v", actor)
	}

	for _, denied := range []string{
		FinancePermissionRead,
		FinancePermissionManage,
		PartnersPermissionRead,
		PartnersPermissionManage,
		SupportPermissionManage,
		DshDispatchCapacityPermissionManage,
	} {
		t.Run("deny-"+denied, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/dsh/operator/cross-domain", nil)
			request.Header.Set("Authorization", "Bearer operations-manager-token")
			response := httptest.NewRecorder()
			if _, allowed := s.requirePermission(response, request, "control-panel", denied); allowed {
				t.Fatalf("operations manager crossed into %s", denied)
			}
			if response.Code != http.StatusForbidden {
				t.Fatalf("expected 403 for %s, got %d", denied, response.Code)
			}
		})
	}
}

func TestRegularEmployeeHasNoImplicitOperatorAuthority(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "staff-1",
			OperatorContextID: "OperatorContext-main",
			Roles:             []string{"employee"},
			AuthState:         "authenticated",
			SessionSurface:    "control-panel",
		})
	})

	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/operations", nil)
	request.Header.Set("Authorization", "Bearer staff-token")
	response := httptest.NewRecorder()
	if _, allowed := s.requirePermission(response, request, "control-panel", OperationsPermissionRead); allowed {
		t.Fatal("regular employee received implicit authority")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", response.Code)
	}
}

func TestPermissionWithoutScopeFailsClosed(t *testing.T) {
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "scope-less-manager",
			OperatorContextID: "OperatorContext-main",
			Roles:             []string{"employee"},
			AuthState:         "authenticated",
			SessionSurface:    "control-panel",
			Permissions: []auth.Permission{
				{Service: "dsh", Surface: "control-panel", Action: PartnersPermissionManage},
			},
		})
	})

	request := httptest.NewRequest(http.MethodPost, "/dsh/operator/stores/store-1/govern", nil)
	request.Header.Set("Authorization", "Bearer scope-less-token")
	response := httptest.NewRecorder()
	if _, allowed := s.requirePermission(response, request, "control-panel", PartnersPermissionManage); allowed {
		t.Fatal("scope-less Identity permission must fail closed")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", response.Code)
	}
}

func TestEmployeePermissionCannotCrossSessionSurface(t *testing.T) {
	permission := auth.Permission{Service: "dsh", Surface: "control-panel", Action: OperationsPermissionManage, Scope: "all"}
	s := fakeIdentityServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:           "operations-manager-1",
			OperatorContextID: "OperatorContext-main",
			Roles:             []string{"employee"},
			AuthState:         "authenticated",
			SessionSurface:    "app-client",
			Permissions:       []auth.Permission{permission},
		})
	})

	request := httptest.NewRequest(http.MethodPost, "/dsh/operator/operations/action", nil)
	request.Header.Set("Authorization", "Bearer wrong-surface-token")
	response := httptest.NewRecorder()
	if _, allowed := s.requirePermission(response, request, "control-panel", OperationsPermissionManage); allowed {
		t.Fatal("control-panel permission crossed from a non-control-panel session")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", response.Code)
	}
}
