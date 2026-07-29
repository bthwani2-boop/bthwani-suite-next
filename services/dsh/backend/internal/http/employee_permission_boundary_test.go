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
			Subject:   "operations-manager-1",
			OperatorContextID:  "tenant-main",
			Roles:     []string{"employee", "workforce.supervise.employee"},
			AuthState: "authenticated",
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
		"operator",
	)
	if !ok {
		t.Fatalf("operations manager exact grant was rejected with status %d", allowedResponse.Code)
	}
	if actor.ID != "operations-manager-1" || actor.Role != "permission:"+OperationsPermissionManage {
		t.Fatalf("unexpected authorized actor %#v", actor)
	}

	for _, denied := range []string{
		FinancePermissionRead,
		FinancePermissionManage,
		PartnersPermissionRead,
		PartnersPermissionManage,
		SupportPermissionManage,
		PlatformPermissionManage,
	} {
		t.Run("deny-"+denied, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/dsh/operator/cross-domain", nil)
			request.Header.Set("Authorization", "Bearer operations-manager-token")
			response := httptest.NewRecorder()
			if _, allowed := s.requirePermission(response, request, "control-panel", denied, "operator"); allowed {
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
			Subject:   "staff-1",
			OperatorContextID:  "tenant-main",
			Roles:     []string{"employee"},
			AuthState: "authenticated",
		})
	})

	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/operations", nil)
	request.Header.Set("Authorization", "Bearer staff-token")
	response := httptest.NewRecorder()
	if _, allowed := s.requirePermission(
		response,
		request,
		"control-panel",
		OperationsPermissionRead,
		"operator",
	); allowed {
		t.Fatal("regular employee received implicit operator authority")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", response.Code)
	}
}
