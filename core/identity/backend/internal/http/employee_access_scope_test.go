package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const validEmployeeProvisionBody = `{"username":"employee-1","phoneE164":"+967770000001","permissionBundle":"staff","departmentScope":"operations"}`

func TestEmployeeProvisionRejectsMissingServerOperatorContext(t *testing.T) {
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "service-secret")
	request := httptest.NewRequest(http.MethodPost, "/internal/employees/provision", strings.NewReader(validEmployeeProvisionBody))
	request.Header.Set("Authorization", "Bearer service-secret")
	request.Header.Set("X-Service-Caller", "workforce")
	response := httptest.NewRecorder()

	(&employeeAccessServer{}).provision(response, request)

	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestEmployeeProvisionRejectsOperatorContextInPayload(t *testing.T) {
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "service-secret")
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/employees/provision",
		strings.NewReader(`{"username":"employee-1","phoneE164":"+967770000001","permissionBundle":"staff","departmentScope":"operations","operatorContextId":"attacker-selected"}`),
	)
	request.Header.Set("Authorization", "Bearer service-secret")
	request.Header.Set("X-Service-Caller", "workforce")
	response := httptest.NewRecorder()

	(&employeeAccessServer{}).provision(response, request)

	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}
