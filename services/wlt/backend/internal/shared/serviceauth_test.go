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

func TestRequireServiceCallerFailsClosedWithoutDelegatedOperatorContext(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	request := authorizedServiceRequest("/wlt/settlements")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("service request without delegated OperatorContext was accepted")
	}
	if recorder.Code != http.StatusBadRequest || !strings.Contains(recorder.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestRequireServiceCallerBindsAuthenticatedDelegatedOperatorContext(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-a")
	recorder := httptest.NewRecorder()

	if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("authenticated service request was rejected status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if got := request.Header.Get("X-Operator-Context-ID"); got != "OperatorContext-a" {
		t.Fatalf("delegated context changed after authentication: got %q", got)
	}
	if scopeID, ok := OperatorContextIDFromContext(request.Context()); !ok || scopeID != "OperatorContext-a" {
		t.Fatalf("delegated context was not propagated, scope=%q ok=%v", scopeID, ok)
	}
}

func TestRequireServiceCallerBindsIdentityDelegatedFinancePrincipal(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	request := authorizedServiceRequest("/wlt/payout-requests/payout-1/approve")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-a")
	request.Header.Set("X-Delegated-Principal-ID", "identity-operator-1")
	recorder := httptest.NewRecorder()

	if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatalf("authenticated service request was rejected status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if principalID, ok := DelegatedFinancePrincipalFromContext(request.Context()); !ok || principalID != "identity-operator-1" {
		t.Fatalf("delegated finance principal was not propagated, principal=%q ok=%v", principalID, ok)
	}
}

func TestRequireServiceCallerPreservesDistinctAuthenticatedContexts(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")

	for _, callerScope := range []string{"OperatorContext-a", "OperatorContext-b"} {
		request := authorizedServiceRequest("/wlt/settlements")
		request.Header.Set("X-Operator-Context-ID", callerScope)
		recorder := httptest.NewRecorder()
		if !RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
			t.Fatalf("authenticated request with caller scope %q was rejected status=%d body=%s", callerScope, recorder.Code, recorder.Body.String())
		}
		if got := request.Header.Get("X-Operator-Context-ID"); got != callerScope {
			t.Fatalf("delegated context %q changed to %q", callerScope, got)
		}
	}
}

func TestRequireServiceCallerAuthenticatesBeforeBindingScope(t *testing.T) {
	t.Setenv("TEST_WLT_SERVICE_TOKEN", "test-token")
	request := authorizedServiceRequest("/wlt/settlements")
	request.Header.Set("Authorization", "Bearer wrong-token")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-a")
	recorder := httptest.NewRecorder()

	if RequireServiceCaller(recorder, request, "TEST_WLT_SERVICE_TOKEN", "dsh") {
		t.Fatal("financial scope header bypassed service authentication")
	}
	if recorder.Code != http.StatusForbidden || !strings.Contains(recorder.Body.String(), "SERVICE_TOKEN_INVALID") {
		t.Fatalf("expected SERVICE_TOKEN_INVALID, got status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if got := request.Header.Get("X-Operator-Context-ID"); got != "OperatorContext-a" {
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
