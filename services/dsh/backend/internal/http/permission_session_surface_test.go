package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"dsh-api/internal/auth"
)

func permissionIdentityServer(
	t *testing.T,
	identity map[string]any,
	permissions []auth.Permission,
	permissionCalls *atomic.Int32,
) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/auth/session":
			if r.Header.Get("Authorization") != "Bearer access-token" {
				http.Error(w, "missing bearer", http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(identity)
		case "/internal/permissions/resolve":
			permissionCalls.Add(1)
			if r.Header.Get("Authorization") != "Bearer service-token" || r.Header.Get("X-Service-Caller") != "dsh" {
				http.Error(w, "invalid service boundary", http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"permissions": permissions})
		default:
			http.NotFound(w, r)
		}
	}))
}

func permissionIdentity(roles []string, sessionSurface string, inlinePermissions []auth.Permission) map[string]any {
	return map[string]any{
		"subject":           "actor-1",
		"operatorContextId": "operator-main",
		"phoneE164":         "+967770000001",
		"roles":             roles,
		"permissions":       inlinePermissions,
		"authState":         "authenticated",
		"sessionId":         "session-1",
		"sessionSurface":    sessionSurface,
	}
}

func permissionRequest() *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/governed", nil)
	req.Header.Set("Authorization", "Bearer access-token")
	return req
}

func TestRequirePermissionRejectsOperatorRoleFromWrongSessionSurface(t *testing.T) {
	t.Parallel()
	var permissionCalls atomic.Int32
	server := permissionIdentityServer(t,
		permissionIdentity([]string{"client", "operator"}, "app-client", nil),
		[]auth.Permission{{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"}},
		&permissionCalls,
	)
	defer server.Close()

	s := &protectedStoreServer{identity: auth.NewClientWithInternalAccess(server.URL, "service-token", "operator-main")}
	response := httptest.NewRecorder()
	if _, ok := s.requirePermission(response, permissionRequest(), "control-panel", "partners.read"); ok {
		t.Fatal("app-client session must not authorize operator control-panel permission")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
	if permissionCalls.Load() != 0 {
		t.Fatalf("RBAC must not be queried for a wrong-surface operator session; calls=%d", permissionCalls.Load())
	}
}

func TestRequirePermissionRejectsNonOperatorInlinePermission(t *testing.T) {
	t.Parallel()
	var permissionCalls atomic.Int32
	inline := []auth.Permission{{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"}}
	server := permissionIdentityServer(t,
		permissionIdentity([]string{"client"}, "app-client", inline),
		nil,
		&permissionCalls,
	)
	defer server.Close()

	s := &protectedStoreServer{identity: auth.NewClientWithInternalAccess(server.URL, "service-token", "operator-main")}
	response := httptest.NewRecorder()
	if _, ok := s.requirePermission(response, permissionRequest(), "control-panel", "partners.read"); ok {
		t.Fatal("non-operator inline permission must never fabricate an operator actor")
	}
	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
	if permissionCalls.Load() != 0 {
		t.Fatalf("RBAC must not be queried for a non-operator session; calls=%d", permissionCalls.Load())
	}
}

func TestRequirePermissionAcceptsOnlyLiveOperatorControlPanelRBAC(t *testing.T) {
	t.Parallel()
	var permissionCalls atomic.Int32
	server := permissionIdentityServer(t,
		permissionIdentity([]string{"operator"}, "control-panel", nil),
		[]auth.Permission{{Service: "dsh", Surface: "control-panel", Action: "partners.read", Scope: "all"}},
		&permissionCalls,
	)
	defer server.Close()

	s := &protectedStoreServer{identity: auth.NewClientWithInternalAccess(server.URL, "service-token", "operator-main")}
	response := httptest.NewRecorder()
	actor, ok := s.requirePermission(response, permissionRequest(), "control-panel", "partners.read")
	if !ok {
		t.Fatalf("valid operator control-panel RBAC session rejected: status=%d body=%s", response.Code, response.Body.String())
	}
	if actor.Role != "operator" || actor.SessionSurface != "control-panel" || actor.SessionID != "session-1" {
		t.Fatalf("unexpected actor projection: %+v", actor)
	}
	if actor.AuthorizationScope != "all" || actor.AuthorizedAction != "partners.read" {
		t.Fatalf("unexpected authorization projection: %+v", actor)
	}
	if permissionCalls.Load() != 1 {
		t.Fatalf("live RBAC must be queried exactly once; calls=%d", permissionCalls.Load())
	}
}
