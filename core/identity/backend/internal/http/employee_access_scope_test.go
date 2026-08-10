package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const validEmployeeProvisionBody = `{"username":"employee-1","phoneE164":"+967770000001","permissionBundle":"staff","departmentScope":"operations"}`

func TestEmployeeProvisionRejectsMissingServerOperatorContext(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	request := httptest.NewRequest(http.MethodPost, "/internal/employees/provision", strings.NewReader(validEmployeeProvisionBody))
	response := httptest.NewRecorder()

	(&employeeAccessServer{}).provision(response, request)

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "INTERNAL_API_UNAVAILABLE") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestEmployeeProvisionRejectsOperatorContextInPayload(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/employees/provision",
		strings.NewReader(`{"username":"employee-1","phoneE164":"+967770000001","permissionBundle":"staff","departmentScope":"operations","operatorContextId":"attacker-selected"}`),
	)
	response := httptest.NewRecorder()

	(&employeeAccessServer{}).provision(response, request)

	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestEmployeeProvisionRejectsMismatchedTrustedHeader(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	t.Setenv("IDENTITY_WORKFORCE_SERVICE_TOKEN", "service-secret")
	request := httptest.NewRequest(http.MethodPost, "/internal/employees/provision", strings.NewReader(validEmployeeProvisionBody))
	request.Header.Set("Authorization", "Bearer service-secret")
	request.Header.Set("X-Service-Caller", "workforce")
	request.Header.Set("X-Operator-Context-ID", "operator-other")
	response := httptest.NewRecorder()

	(&employeeAccessServer{}).provision(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}
