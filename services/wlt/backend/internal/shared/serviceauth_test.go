package shared

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func authorizedServiceRequest(path string) *http.Request {
	request := httptest.NewRequest(http.MethodGet, path, nil)
	request.Header.Set("Authorization", "Bearer test-token")
	request.Header.Set("X-Service-Caller", "dsh")
	return request
}

func configureActiveSaaS(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "tenant-main")
}

func TestRequireServiceCallerRequiresPromotionFundingTenant(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	missing := httptest.NewRecorder()
	if RequireServiceCaller(
		missing,
		authorizedServiceRequest("/wlt/promotion-funding/reservations/pfr_123"),
		"TEST_WLT_SERVICE_TOKEN",
		"dsh",
	) {
		t.Fatal("promotion funding request without X-Tenant-ID was accepted")
	}
	if missing.Code != http.StatusBadRequest {
		t.Fatalf("missing tenant status=%d, want %d", missing.Code, http.StatusBadRequest)
	}

	presentRequest := authorizedServiceRequest("/wlt/promotion-funding/reservations/pfr_123")
	presentRequest.Header.Set("X-Tenant-ID", "tenant-1")
	present := httptest.NewRecorder()
	if !RequireServiceCaller(present, presentRequest, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("asserted tenant was rejected with status=%d", present.Code)
	}
}

func TestRequireServiceCallerDoesNotRequireTenantOutsideActiveSaaS(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "blocked")
	recorder := httptest.NewRecorder()
	if !RequireServiceCaller(
		recorder,
		authorizedServiceRequest("/wlt/settlements"),
		"TEST_WLT_SERVICE_TOKEN",
		"dsh",
	) {
		t.Fatalf("unrelated governed read was rejected with status=%d", recorder.Code)
	}
}

func TestRequireServiceCallerRequiresTenantForEveryActiveSaaSCall(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	configureActiveSaaS(t)

	recorder := httptest.NewRecorder()
	if RequireServiceCaller(
		recorder,
		authorizedServiceRequest("/wlt/settlements"),
		"TEST_WLT_SERVICE_TOKEN",
		"dsh",
	) {
		t.Fatal("active SaaS service call without tenant was accepted")
	}
	if recorder.Code != http.StatusBadRequest || !strings.Contains(recorder.Body.String(), "MISSING_TENANT_ID") {
		t.Fatalf("expected MISSING_TENANT_ID, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireServiceCallerRejectsCrossTenantServiceCall(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	configureActiveSaaS(t)
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Tenant-ID", "tenant-other")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("cross-tenant service call was accepted")
	}
	if recorder.Code != http.StatusForbidden || !strings.Contains(recorder.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireServiceCallerAcceptsTrustedActiveSaaSTenant(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	configureActiveSaaS(t)
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Tenant-ID", "tenant-main")
	recorder := httptest.NewRecorder()

	if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("trusted tenant was rejected with status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireServiceCallerFailsClosedWhenActiveTenantIsUnconfigured(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "authorized")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Tenant-ID", "tenant-main")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("active SaaS call was accepted without configured runtime tenant")
	}
	if recorder.Code != http.StatusServiceUnavailable || !strings.Contains(recorder.Body.String(), "SAAS_TENANT_NOT_CONFIGURED") {
		t.Fatalf("expected SAAS_TENANT_NOT_CONFIGURED, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}
