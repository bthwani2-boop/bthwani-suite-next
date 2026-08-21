package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/fieldassignment"
)

func TestWriteFieldAssignmentErrorMapsGovernedFailures(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{name: "invalid", err: fieldassignment.ErrInvalid, wantStatus: http.StatusBadRequest},
		{name: "not found", err: fieldassignment.ErrNotFound, wantStatus: http.StatusNotFound},
		{name: "forbidden", err: fieldassignment.ErrForbidden, wantStatus: http.StatusForbidden},
		{name: "version conflict", err: fieldassignment.ErrVersionConflict, wantStatus: http.StatusConflict},
		{name: "invalid transition", err: fieldassignment.ErrInvalidTransition, wantStatus: http.StatusConflict},
		{name: "internal", err: errors.New("database unavailable"), wantStatus: http.StatusInternalServerError},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			writeFieldAssignmentError(response, tc.err)
			if response.Code != tc.wantStatus {
				t.Fatalf("status=%d, want %d", response.Code, tc.wantStatus)
			}
		})
	}
}

func TestCreateFieldOnboardingAssignmentRejectsUnavailableWorkforceAfterValidation(t *testing.T) {
	s := fakeIdentityServerWithRBAC(t,
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(auth.Identity{
				Subject: "operator-1", OperatorContextID: "operator-context-1", Roles: []string{"operator"},
				AuthState: "authenticated", SessionSurface: "control-panel",
			})
		},
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{"permissions": []auth.Permission{{
				Service: "dsh", Surface: "control-panel", Action: PartnersPermissionManage, Scope: "all",
			}}})
		},
	)
	request := httptest.NewRequest(http.MethodPost, "/dsh/operator/field-onboarding-assignments", bytes.NewBufferString(`{"fieldActorId":"field-1","businessTaskKey":"task-1","storeNameHint":"Store One","phoneHint":"+967700000001"}`))
	request.Header.Set("Authorization", "Bearer [REDACTED:Bearer token]")
	response := httptest.NewRecorder()

	s.handleCreateFieldOnboardingAssignment(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d, want %d, body=%s", response.Code, http.StatusServiceUnavailable, response.Body.String())
	}
}

func fieldAssignmentPermissionServer(t *testing.T, operatorContextID string) *protectedStoreServer {
	t.Helper()
	return fakeIdentityServerWithRBAC(t,
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(auth.Identity{
				Subject: "operator-1", OperatorContextID: operatorContextID, Roles: []string{"operator"},
				AuthState: "authenticated", SessionSurface: "control-panel",
			})
		},
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{"permissions": []auth.Permission{{
				Service: "dsh", Surface: "control-panel", Action: PartnersPermissionManage, Scope: "all",
			}}})
		},
	)
}

func TestFieldOnboardingAssignmentMutationHandlersRejectInvalidBodiesBeforeDatabase(t *testing.T) {
	tests := []struct {
		name    string
		handler func(*protectedStoreServer, http.ResponseWriter, *http.Request)
		method  string
		target  string
		body    string
	}{
		{name: "create malformed", handler: (*protectedStoreServer).handleCreateFieldOnboardingAssignment, method: http.MethodPost, target: "/dsh/operator/field-onboarding-assignments", body: "{"},
		{name: "create unknown field", handler: (*protectedStoreServer).handleCreateFieldOnboardingAssignment, method: http.MethodPost, target: "/dsh/operator/field-onboarding-assignments", body: `{"fieldActorId":"field-1","unknown":true}`},
		{name: "reassign malformed", handler: (*protectedStoreServer).handleReassignFieldOnboardingAssignment, method: http.MethodPost, target: "/dsh/operator/field-onboarding-assignments/a-1/reassign", body: "{"},
		{name: "cancel malformed", handler: (*protectedStoreServer).handleCancelFieldOnboardingAssignment, method: http.MethodPost, target: "/dsh/operator/field-onboarding-assignments/a-1/cancel", body: "{"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := fieldAssignmentPermissionServer(t, "operator-context-1")
			request := httptest.NewRequest(tc.method, tc.target, bytes.NewBufferString(tc.body))
			request.Header.Set("Authorization", "Bearer [REDACTED:Bearer token]")
			response := httptest.NewRecorder()

			tc.handler(s, response, request)

			if response.Code != http.StatusBadRequest {
				t.Fatalf("status=%d, want 400, body=%s", response.Code, response.Body.String())
			}
		})
	}
}
