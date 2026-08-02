package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
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

func TestInternalAssignmentsRejectClientSelectedOperatorContext(t *testing.T) {
	server := &server{internalDSHToken: "configured-dsh-token"}
	handler := server.internalOnly(server.handleSetActorScopes)
	request := httptest.NewRequest(
		http.MethodPut,
		"/internal/assignments/field-1/scopes",
		strings.NewReader(`{"role":"field","operatorContextId":"spoofed","inputs":[]}`),
	)
	request.SetPathValue("actorId", "field-1")
	request.Header.Set("Authorization", "Bearer configured-dsh-token")
	request.Header.Set("X-Service-Caller", "dsh")
	request.Header.Set("X-Operator-Context-ID", "trusted-context")
	request.Header.Set("X-Actor-ID", "operator-1")
	request.Header.Set("X-Correlation-ID", "corr-1")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("client-selected operatorContextId must be rejected, got %d", response.Code)
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
