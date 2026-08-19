package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"workforce-api/internal/auth"
	"workforce-api/internal/identityclient"
)

func TestInternalAssignmentsRequireConfiguredDSHServiceIdentity(t *testing.T) {
	server := &server{internalDSHToken: "configured-dsh-token"}
	called := false
	handler := server.internalOnly(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	})

	for name, credentials := range map[string][2]string{
		"retired literal token": {"Bearer WORKFORCE_DSH_SERVICE_TOKEN", "dsh"},
		"missing caller":        {"Bearer configured-dsh-token", ""},
		"wrong caller":          {"Bearer configured-dsh-token", "browser"},
		"wrong token":           {"Bearer different-token", "dsh"},
	} {
		t.Run(name, func(t *testing.T) {
			called = false
			request := httptest.NewRequest(http.MethodGet, "/internal/assignments/field-1/scopes", nil)
			request.Header.Set("Authorization", credentials[0])
			request.Header.Set("X-Service-Caller", credentials[1])
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != http.StatusUnauthorized || called {
				t.Fatalf("expected fail-closed 401, code=%d called=%v", response.Code, called)
			}
		})
	}

	request := httptest.NewRequest(http.MethodGet, "/internal/assignments/field-1/scopes", nil)
	request.Header.Set("Authorization", "Bearer configured-dsh-token")
	request.Header.Set("X-Service-Caller", "dsh")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusNoContent || !called {
		t.Fatalf("expected authenticated DSH service call, code=%d called=%v", response.Code, called)
	}
}

func TestInternalAssignmentsDSHBoundaryIsReadOnly(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil, "configured-dsh-token")
	request := httptest.NewRequest(http.MethodPut, "/internal/assignments/field-1/scopes", nil)
	request.Header.Set("Authorization", "Bearer configured-dsh-token")
	request.Header.Set("X-Service-Caller", "dsh")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("DSH must not have a Workforce assignment mutation route, got %d", response.Code)
	}
	if allow := response.Header().Get("Allow"); !strings.Contains(allow, http.MethodGet) || strings.Contains(allow, http.MethodPut) {
		t.Fatalf("expected read-only assignment boundary, Allow=%q", allow)
	}
}

func TestInternalAssignmentsRequireTrustedContextHeader(t *testing.T) {
	server := &server{internalDSHToken: "configured-dsh-token"}
	handler := server.internalOnly(server.handleGetActorScopes)
	request := httptest.NewRequest(http.MethodGet, "/internal/assignments/field-1/scopes?role=field&operatorContextId=spoofed", nil)
	request.SetPathValue("actorId", "field-1")
	request.Header.Set("Authorization", "Bearer configured-dsh-token")
	request.Header.Set("X-Service-Caller", "dsh")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("query-selected operator context must not satisfy trusted context, got %d", response.Code)
	}
}

func TestInternalAssignmentsContextIsAttestedByIdentity(t *testing.T) {
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Operator-Context-ID") != "context-main" {
			t.Fatalf("expected context-main at Identity, got %q", r.Header.Get("X-Operator-Context-ID"))
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(identityclient.ActorView{ActorID: "field-1", Roles: []string{"field"}})
	}))
	defer identityServer.Close()

	server := &server{identity: identityclient.NewClient(identityServer.URL, "identity-token")}
	trusted, err := server.verifyAssignmentActorContext(context.Background(), "field-1", "context-main", "field")
	if err != nil {
		t.Fatalf("expected verified assignment context, got %v", err)
	}
	if got, ok := auth.OperatorContextIDFromContext(trusted); !ok || got != "context-main" {
		t.Fatalf("expected only the verified context to reach Workforce, got %q (ok=%v)", got, ok)
	}
}

func TestInternalAssignmentsRejectRoleOutsideIdentityBoundary(t *testing.T) {
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(identityclient.ActorView{ActorID: "field-1", Roles: []string{"field"}})
	}))
	defer identityServer.Close()

	server := &server{identity: identityclient.NewClient(identityServer.URL, "identity-token")}
	if _, err := server.verifyAssignmentActorContext(context.Background(), "field-1", "context-main", "captain"); !errors.Is(err, identityclient.ErrOperatorContextForbidden) {
		t.Fatalf("expected role boundary rejection, got %v", err)
	}
}
