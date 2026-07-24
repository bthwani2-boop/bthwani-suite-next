package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

type tenantBoundaryError struct {
	Code string `json:"code"`
}

func tenantBoundaryErrorCode(t *testing.T, recorder *httptest.ResponseRecorder) string {
	t.Helper()
	var payload tenantBoundaryError
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode tenant boundary response: %v", err)
	}
	return payload.Code
}

func TestRequiredPaymentTenantUsesAuthenticatedActorTenant(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/control-panel/finance/refunds", nil)

	tenantID, ok := requiredPaymentTenant(recorder, request, "tenant-a")
	if !ok {
		t.Fatalf("expected actor tenant to be accepted, status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if tenantID != "tenant-a" {
		t.Fatalf("expected tenant-a, got %q", tenantID)
	}
}

func TestRequiredPaymentTenantAcceptsMatchingLegacySelector(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/control-panel/finance/refunds", nil)
	request.Header.Set("X-Tenant-ID", "tenant-a")

	tenantID, ok := requiredPaymentTenant(recorder, request, "tenant-a")
	if !ok || tenantID != "tenant-a" {
		t.Fatalf("expected matching selector to confirm actor tenant, status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequiredPaymentTenantRejectsMismatchingSelector(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/control-panel/finance/refunds", nil)
	request.Header.Set("X-Tenant-ID", "tenant-b")

	if tenantID, ok := requiredPaymentTenant(recorder, request, "tenant-a"); ok || tenantID != "" {
		t.Fatalf("expected mismatching selector to fail closed, tenant=%q", tenantID)
	}
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", recorder.Code)
	}
	if code := tenantBoundaryErrorCode(t, recorder); code != "TENANT_MISMATCH" {
		t.Fatalf("expected TENANT_MISMATCH, got %q", code)
	}
}

func TestRequiredPaymentTenantRejectsMissingActorTenant(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/control-panel/finance/refunds", nil)

	if tenantID, ok := requiredPaymentTenant(recorder, request, ""); ok || tenantID != "" {
		t.Fatalf("expected missing actor tenant to fail closed, tenant=%q", tenantID)
	}
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
	if code := tenantBoundaryErrorCode(t, recorder); code != "MISSING_TENANT_ID" {
		t.Fatalf("expected MISSING_TENANT_ID, got %q", code)
	}
}
