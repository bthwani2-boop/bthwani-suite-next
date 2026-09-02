package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"dsh-api/internal/auth"
	"dsh-api/internal/fieldassignment"
	"dsh-api/internal/workforceclient"
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
			_ = json.NewEncoder(w).Encode(auth.ActorIdentity{
				Subject: "operator-1", OperatorContextID: "operator-context-1", Roles: []string{"operator"},
				AuthState: "authenticated", SessionSurface: "control-panel",
			})
		},
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{"permissions": []auth.Permission{{
				Service: "dsh", Surface: "control-panel", Action: PartnersPermissionManage, Scope: "all",
			}, {
				Service: "dsh", Surface: "control-panel", Action: PartnersPermissionRead, Scope: "all",
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
			_ = json.NewEncoder(w).Encode(auth.ActorIdentity{
				Subject: "operator-1", OperatorContextID: operatorContextID, Roles: []string{"operator"},
				AuthState: "authenticated", SessionSurface: "control-panel",
			})
		},
		func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{"permissions": []auth.Permission{{
				Service: "dsh", Surface: "control-panel", Action: PartnersPermissionManage, Scope: "all",
			}, {
				Service: "dsh", Surface: "control-panel", Action: PartnersPermissionRead, Scope: "all",
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

func fieldAssignmentFieldServer(t *testing.T, fieldActorID, operatorContextID string) *protectedStoreServer {
	t.Helper()
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.ActorIdentity{
			Subject: fieldActorID, OperatorContextID: operatorContextID, Roles: []string{"field"},
			AuthState: "authenticated", SessionSurface: "app-field",
		})
	}))
	t.Cleanup(identityServer.Close)

	workforceServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/internal/assignments/" + fieldActorID + "/scopes":
			_ = json.NewEncoder(w).Encode(workforceclient.ActorScopes{ActorID: fieldActorID, Role: "field", OperatorContextID: operatorContextID})
		case "/internal/fields/" + fieldActorID + "/readiness":
			_ = json.NewEncoder(w).Encode(map[string]any{"activationReadiness": map[string]any{"isActive": true}})
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(workforceServer.Close)

	return &protectedStoreServer{
		identity:  auth.NewClient(identityServer.URL),
		workforce: workforceclient.NewClient(workforceServer.URL, "service-token"),
	}
}

func TestListOperatorFieldOnboardingAssignmentsReadsCanonicalDBRows(t *testing.T) {
	db := openTestDB(t)
	operatorContextID := "local-dsh"
	fieldActorID := "field-http-list-" + fmt.Sprint(time.Now().UnixNano())
	assignment, err := fieldassignment.Create(t.Context(), db, operatorContextID, "operator-1", fieldassignment.CreateInput{
		FieldActorID: fieldActorID, BusinessTaskKey: "http-list-" + fmt.Sprint(time.Now().UnixNano()), StoreNameHint: "HTTP List Store", PhoneHint: "+967770000091",
	})
	if err != nil {
		t.Fatalf("create assignment fixture: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id = $1`, assignment.ID) })

	s := fieldAssignmentPermissionServer(t, operatorContextID)
	s.db = db
	request := httptest.NewRequest(http.MethodGet, "/dsh/operator/field-onboarding-assignments", nil)
	request.Header.Set("Authorization", "Bearer [REDACTED:Bearer token]")
	response := httptest.NewRecorder()

	s.handleListOperatorFieldOnboardingAssignments(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d, body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		Assignments []fieldassignment.Assignment `json:"assignments"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	found := false
	for _, item := range payload.Assignments {
		if item.ID == assignment.ID && item.FieldActorID == fieldActorID {
			found = true
		}
	}
	if !found {
		t.Fatalf("canonical operator readback omitted assignment %s: %#v", assignment.ID, payload.Assignments)
	}
}

func TestListFieldOnboardingAssignmentsReadsCanonicalDBRowsAfterWorkforceAttestation(t *testing.T) {
	db := openTestDB(t)
	operatorContextID := "local-dsh"
	fieldActorID := "field-http-self-" + fmt.Sprint(time.Now().UnixNano())
	assignment, err := fieldassignment.Create(t.Context(), db, operatorContextID, "operator-1", fieldassignment.CreateInput{
		FieldActorID: fieldActorID, BusinessTaskKey: "http-self-" + fmt.Sprint(time.Now().UnixNano()), StoreNameHint: "HTTP Self Store", PhoneHint: "+967770000092",
	})
	if err != nil {
		t.Fatalf("create assignment fixture: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id = $1`, assignment.ID) })

	s := fieldAssignmentFieldServer(t, fieldActorID, operatorContextID)
	s.db = db
	request := httptest.NewRequest(http.MethodGet, "/dsh/field/onboarding-assignments", nil)
	request.Header.Set("Authorization", "Bearer [REDACTED:Bearer token]")
	response := httptest.NewRecorder()

	s.handleListFieldOnboardingAssignments(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d, body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		Assignments []fieldassignment.Assignment `json:"assignments"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload.Assignments) == 0 || payload.Assignments[0].ID != assignment.ID {
		t.Fatalf("canonical field readback drifted: %#v", payload.Assignments)
	}
}

func TestGetFieldOnboardingAssignmentReadsCanonicalDBRowWithinFieldScope(t *testing.T) {
	db := openTestDB(t)
	operatorContextID := "local-dsh"
	fieldActorID := "field-http-detail-" + fmt.Sprint(time.Now().UnixNano())
	assignment, err := fieldassignment.Create(t.Context(), db, operatorContextID, "operator-1", fieldassignment.CreateInput{
		FieldActorID: fieldActorID, BusinessTaskKey: "http-detail-" + fmt.Sprint(time.Now().UnixNano()), StoreNameHint: "HTTP Detail Store", PhoneHint: "+967770000093",
	})
	if err != nil {
		t.Fatalf("create assignment fixture: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM dsh_field_onboarding_assignments WHERE id = $1`, assignment.ID) })

	s := fieldAssignmentFieldServer(t, fieldActorID, operatorContextID)
	s.db = db
	request := httptest.NewRequest(http.MethodGet, "/dsh/field/onboarding-assignments/"+assignment.ID, nil)
	request.SetPathValue("assignmentId", assignment.ID)
	request.Header.Set("Authorization", "Bearer [REDACTED:Bearer token]")
	response := httptest.NewRecorder()

	s.handleGetFieldOnboardingAssignment(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status=%d, body=%s", response.Code, response.Body.String())
	}
	var payload struct {
		Assignment fieldassignment.Assignment `json:"assignment"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Assignment.ID != assignment.ID || payload.Assignment.FieldActorID != fieldActorID {
		t.Fatalf("canonical field detail readback drifted: %#v", payload.Assignment)
	}
}
