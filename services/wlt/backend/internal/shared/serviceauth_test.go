package shared

import (
	"context"
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
		t.Fatal("promotion funding request without X-Operator-Context-ID was accepted")
	}
	if missing.Code != http.StatusBadRequest {
		t.Fatalf("missing tenant status=%d, want %d", missing.Code, http.StatusBadRequest)
	}

	presentRequest := authorizedServiceRequest("/wlt/promotion-funding/reservations/pfr_123")
	presentRequest.Header.Set("X-Operator-Context-ID", "tenant-1")
	present := httptest.NewRecorder()
	if !RequireServiceCaller(present, presentRequest, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("asserted tenant was rejected with status=%d", present.Code)
	}
}

func TestRequireServiceCallerRequiresTenantOutsideActiveSaaS(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "blocked")

	missing := httptest.NewRecorder()
	if RequireServiceCaller(
		missing,
		authorizedServiceRequest("/wlt/settlements"),
		"TEST_WLT_SERVICE_TOKEN",
		"dsh",
	) {
		t.Fatal("financial request without X-Operator-Context-ID was accepted outside active SaaS")
	}
	if missing.Code != http.StatusBadRequest || !strings.Contains(missing.Body.String(), "MISSING_TENANT_ID") {
		t.Fatalf("expected MISSING_TENANT_ID, got status=%d body=%s", missing.Code, missing.Body.String())
	}

	presentRequest := authorizedServiceRequest("/wlt/settlements")
	presentRequest.Header.Set("X-Operator-Context-ID", "tenant-deferred")
	present := httptest.NewRecorder()
	if !RequireServiceCaller(present, presentRequest, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("explicit deferred tenant was rejected with status=%d body=%s", present.Code, present.Body.String())
	}
	if operatorContextID, ok := OperatorContextIDFromContext(presentRequest.Context()); !ok || operatorContextID != "tenant-deferred" {
		t.Fatalf("trusted tenant was not propagated, tenant=%q ok=%v", operatorContextID, ok)
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

func TestRequireServiceCallerAcceptsDistinctAuthenticatedTenants(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	configureActiveSaaS(t)

	for _, operatorContextID := range []string{"tenant-a", "tenant-b"} {
		request := authorizedServiceRequest("/wlt/settlements")
		request.Header.Set("X-Operator-Context-ID", operatorContextID)
		recorder := httptest.NewRecorder()
		if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
			t.Fatalf("authenticated tenant %s was rejected status=%d body=%s", operatorContextID, recorder.Code, recorder.Body.String())
		}
	}
}

func TestRequireServiceCallerDoesNotTrustTenantBeforeServiceAuthentication(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	configureActiveSaaS(t)
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("Authorization", "Bearer wrong-token")
	request.Header.Set("X-Operator-Context-ID", "tenant-a")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("tenant header bypassed service authentication")
	}
	if recorder.Code != http.StatusForbidden || !strings.Contains(recorder.Body.String(), "SERVICE_TOKEN_INVALID") {
		t.Fatalf("expected SERVICE_TOKEN_INVALID, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireServiceCallerFailsClosedForInvalidActiveSaaSState(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("BTHWANI_COMMERCIAL_ACTIVATION_STATE", "blocked")
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Operator-Context-ID", "tenant-a")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("active SaaS call was accepted with blocked commercial state")
	}
	if recorder.Code != http.StatusServiceUnavailable || !strings.Contains(recorder.Body.String(), "SAAS_RUNTIME_CONFIG_INVALID") {
		t.Fatalf("expected SAAS_RUNTIME_CONFIG_INVALID, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireOperatorContextFailsClosedWithoutTrustedTenant(t *testing.T) {
	operatorContextID, err := RequireOperatorContext(context.Background())
	if err == nil || operatorContextID != "" {
		t.Fatalf("missing tenant context returned tenant=%q err=%v", operatorContextID, err)
	}

	ctx := WithOperatorContext(context.Background(), "tenant-a")
	operatorContextID, err = RequireOperatorContext(ctx)
	if err != nil || operatorContextID != "tenant-a" {
		t.Fatalf("trusted tenant context returned tenant=%q err=%v", operatorContextID, err)
	}
}
