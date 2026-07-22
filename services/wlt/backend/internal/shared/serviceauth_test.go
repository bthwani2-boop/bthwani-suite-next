package shared

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func authorizedServiceRequest(path string) *http.Request {
	request := httptest.NewRequest(http.MethodGet, path, nil)
	request.Header.Set("Authorization", "Bearer test-token")
	request.Header.Set("X-Service-Caller", "dsh")
	return request
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

func TestRequireServiceCallerDoesNotRequireTenantForUnrelatedRead(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
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
