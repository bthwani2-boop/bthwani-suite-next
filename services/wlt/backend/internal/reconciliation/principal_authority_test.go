package reconciliation

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestAssignCaseHandlerRejectsBodySuppliedOperator(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/reconciliation-cases/case-1/assign", strings.NewReader(`{"operatorId":"forged"}`))
	req.SetPathValue("caseId", "case-1")
	rec := httptest.NewRecorder()

	HandleAssignCase(nil)(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected forged operator body to be rejected with 400, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestResolveCaseHandlerRequiresAuthenticatedPrincipal(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/reconciliation-cases/case-1/resolve", strings.NewReader(`{"resolutionAction":"confirmed_failed","resolutionNote":"provider declined"}`))
	req.SetPathValue("caseId", "case-1")
	rec := httptest.NewRecorder()

	HandleResolveCase(nil)(rec, req)

	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), "AUTHENTICATED_PRINCIPAL_REQUIRED") {
		t.Fatalf("expected missing principal to fail closed with 403, got %d body=%s", rec.Code, rec.Body.String())
	}
}
