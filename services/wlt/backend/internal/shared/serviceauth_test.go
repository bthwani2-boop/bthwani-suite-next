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

func TestRequireServiceCallerRequiresPromotionFundingOperatorContext(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	missing := httptest.NewRecorder()
	if RequireServiceCaller(
		missing,
		authorizedServiceRequest("/wlt/promotion-funding/reservations/pfr_123"),
		"TEST_WLT_SERVICE_TOKEN",
		"dsh",
	) {
		t.Fatal("financial request without X-Operator-Context-ID was accepted")
	}
	if missing.Code != http.StatusBadRequest || !strings.Contains(missing.Body.String(), "MISSING_operator_context_id") {
		t.Fatalf("expected MISSING_operator_context_id, got status=%d body=%s", missing.Code, missing.Body.String())
	}

	presentRequest := authorizedServiceRequest("/wlt/promotion-funding/reservations/pfr_123")
	presentRequest.Header.Set("X-Operator-Context-ID", "OperatorContext-1")
	present := httptest.NewRecorder()
	if !RequireServiceCaller(present, presentRequest, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("asserted OperatorContext was rejected with status=%d", present.Code)
	}
}

func TestRequireServiceCallerRequiresOperatorContextForEveryCall(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	recorder := httptest.NewRecorder()
	if RequireServiceCaller(
		recorder,
		authorizedServiceRequest("/wlt/settlements"),
		"TEST_WLT_SERVICE_TOKEN",
		"dsh",
	) {
		t.Fatal("service call without OperatorContext was accepted")
	}
	if recorder.Code != http.StatusBadRequest || !strings.Contains(recorder.Body.String(), "MISSING_operator_context_id") {
		t.Fatalf("expected MISSING_operator_context_id, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}

	presentRequest := authorizedServiceRequest("/wlt/settlements")
	presentRequest.Header.Set("X-Operator-Context-ID", "OperatorContext-1")
	present := httptest.NewRecorder()
	if !RequireServiceCaller(present, presentRequest, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("explicit OperatorContext was rejected with status=%d body=%s", present.Code, present.Body.String())
	}
	if operatorContextID, ok := OperatorContextIDFromContext(presentRequest.Context()); !ok || operatorContextID != "OperatorContext-1" {
		t.Fatalf("trusted OperatorContext was not propagated, OperatorContext=%q ok=%v", operatorContextID, ok)
	}
}

func TestRequireServiceCallerAcceptsDistinctAuthenticatedOperatorContexts(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	for _, operatorContextID := range []string{"OperatorContext-a", "OperatorContext-b"} {
		request := authorizedServiceRequest("/wlt/settlements")
		request.Header.Set("X-Operator-Context-ID", operatorContextID)
		recorder := httptest.NewRecorder()
		if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
			t.Fatalf("authenticated OperatorContext %s was rejected status=%d body=%s", operatorContextID, recorder.Code, recorder.Body.String())
		}
	}
}

func TestRequireServiceCallerDoesNotTrustOperatorContextBeforeServiceAuthentication(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("Authorization", "Bearer wrong-token")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-a")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("OperatorContext header bypassed service authentication")
	}
	if recorder.Code != http.StatusForbidden || !strings.Contains(recorder.Body.String(), "SERVICE_TOKEN_INVALID") {
		t.Fatalf("expected SERVICE_TOKEN_INVALID, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireOperatorContextFailsClosedWithoutTrustedOperatorContext(t *testing.T) {
	operatorContextID, err := RequireOperatorContext(context.Background())
	if err == nil || operatorContextID != "" {
		t.Fatalf("missing OperatorContext context returned OperatorContext=%q err=%v", operatorContextID, err)
	}

	ctx := WithOperatorContext(context.Background(), "OperatorContext-a")
	operatorContextID, err = RequireOperatorContext(ctx)
	if err != nil || operatorContextID != "OperatorContext-a" {
		t.Fatalf("trusted OperatorContext context returned OperatorContext=%q err=%v", operatorContextID, err)
	}
}
