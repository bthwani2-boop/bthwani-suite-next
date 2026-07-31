package http

import (
	"net/http/httptest"
	"strings"
	"testing"

	"platform-control-api/internal/auth"
)

func configureOperatorContext(t *testing.T) {
	t.Helper()
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "platform-main")
}

func TestOperatorContextAcceptsMatchingIdentityContext(t *testing.T) {
	configureOperatorContext(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	ok := enforceOperatorContext(response, request, auth.Identity{
		Subject:           "operator-1",
		OperatorContextID: "platform-main",
	})

	if !ok || response.Code != 200 {
		t.Fatalf("expected trusted operator context, got ok=%v status=%d body=%s", ok, response.Code, response.Body.String())
	}
}

func TestOperatorContextRejectsMissingIdentityContext(t *testing.T) {
	configureOperatorContext(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceOperatorContext(response, request, auth.Identity{Subject: "operator-1"}) {
		t.Fatal("expected missing identity operator context to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestOperatorContextRejectsMismatchedIdentityContext(t *testing.T) {
	configureOperatorContext(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceOperatorContext(response, request, auth.Identity{Subject: "operator-1", OperatorContextID: "platform-other"}) {
		t.Fatal("expected mismatched operator context to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestOperatorContextRejectsClientOverride(t *testing.T) {
	configureOperatorContext(t)
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	request.Header.Set("X-Operator-Context-ID", "platform-other")
	response := httptest.NewRecorder()

	if enforceOperatorContext(response, request, auth.Identity{Subject: "operator-1", OperatorContextID: "platform-main"}) {
		t.Fatal("expected client operator-context override to fail closed")
	}
	if response.Code != 403 || !strings.Contains(response.Body.String(), "UNTRUSTED_OPERATOR_CONTEXT") {
		t.Fatalf("expected UNTRUSTED_OPERATOR_CONTEXT, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestOperatorContextRejectsMissingRuntimeConfiguration(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	request := httptest.NewRequest("GET", "/platform/v1/runtime-config", nil)
	response := httptest.NewRecorder()

	if enforceOperatorContext(response, request, auth.Identity{Subject: "operator-1", OperatorContextID: "platform-main"}) {
		t.Fatal("expected missing runtime operator context to fail closed")
	}
	if response.Code != 503 || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_CONFIG_INVALID") {
		t.Fatalf("expected OPERATOR_CONTEXT_CONFIG_INVALID, got status=%d body=%s", response.Code, response.Body.String())
	}
}
