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

func TestRequireServiceCallerFailsClosedWithoutConfiguredFinancialScope(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")

	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Operator-Context-ID", "caller-selected-scope")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("caller-selected financial scope was accepted without server configuration")
	}
	if recorder.Code != http.StatusServiceUnavailable || !strings.Contains(recorder.Body.String(), "FINANCIAL_SCOPE_NOT_CONFIGURED") {
		t.Fatalf("expected FINANCIAL_SCOPE_NOT_CONFIGURED, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireServiceCallerOverridesCallerSelectedFinancialScope(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "local-dsh")

	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Operator-Context-ID", "untrusted-caller-scope")
	recorder := httptest.NewRecorder()

	if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("authenticated service request was rejected status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if got := request.Header.Get("X-Operator-Context-ID"); got != "local-dsh" {
		t.Fatalf("caller header was not replaced by server scope: got %q", got)
	}
	if scopeID, ok := OperatorContextIDFromContext(request.Context()); !ok || scopeID != "local-dsh" {
		t.Fatalf("server scope was not propagated, scope=%q ok=%v", scopeID, ok)
	}
}

func TestRequireServiceCallerCollapsesDistinctCallerScopesToServerScope(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "local-dsh")

	for _, callerScope := range []string{"tenant-a", "tenant-b", "partner-42", ""} {
		request := authorizedServiceRequest("/wlt/settlements")
		request.Header.Set("X-Operator-Context-ID", callerScope)
		recorder := httptest.NewRecorder()
		if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
			t.Fatalf("authenticated request with caller scope %q was rejected status=%d body=%s", callerScope, recorder.Code, recorder.Body.String())
		}
		if got := request.Header.Get("X-Operator-Context-ID"); got != "local-dsh" {
			t.Fatalf("caller scope %q survived authentication as %q", callerScope, got)
		}
	}
}

func TestRequireServiceCallerAuthenticatesBeforeBindingScope(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "local-dsh")
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("Authorization", "Bearer wrong-token")
	request.Header.Set("X-Operator-Context-ID", "caller-selected-scope")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("financial scope header bypassed service authentication")
	}
	if recorder.Code != http.StatusForbidden || !strings.Contains(recorder.Body.String(), "SERVICE_TOKEN_INVALID") {
		t.Fatalf("expected SERVICE_TOKEN_INVALID, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if got := request.Header.Get("X-Operator-Context-ID"); got != "caller-selected-scope" {
		t.Fatalf("unauthenticated request was mutated before authentication: got %q", got)
	}
}

func TestRequireOperatorContextCompatibilityAccessorFailsClosedWithoutBoundScope(t *testing.T) {
	scopeID, err := RequireOperatorContext(context.Background())
	if err == nil || scopeID != "" {
		t.Fatalf("missing compatibility scope returned scope=%q err=%v", scopeID, err)
	}

	ctx := WithOperatorContext(context.Background(), "local-dsh")
	scopeID, err = RequireOperatorContext(ctx)
	if err != nil || scopeID != "local-dsh" {
		t.Fatalf("bound compatibility scope returned scope=%q err=%v", scopeID, err)
	}
}
