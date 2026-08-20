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
