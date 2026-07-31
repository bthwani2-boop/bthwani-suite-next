package shared

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func configureReferenceAuth(t *testing.T) {
	t.Helper()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "service-token")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "server-owned-context")
}

func referenceRequest() *http.Request {
	return httptest.NewRequest(http.MethodGet, "/wlt/references/payment-status?orderId=order-1", nil)
}

func trustedDshReferenceRequestForTest() *http.Request {
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer service-token")
	request.Header.Set("X-Service-Caller", "dsh")
	return request
}

func TestReferenceReaderCollapsesDistinctTrustedDshContextsToServerScope(t *testing.T) {
	configureReferenceAuth(t)
	for _, callerContextID := range []string{"OperatorContext-a", "OperatorContext-b", ""} {
		request := trustedDshReferenceRequestForTest()
		request.Header.Set("X-Operator-Context-ID", callerContextID)
		response := httptest.NewRecorder()

		if !RequireReferenceReader(response, request) {
			t.Fatalf("trusted DSH request with caller context %q was rejected status=%d body=%s", callerContextID, response.Code, response.Body.String())
		}
		if got := request.Header.Get("X-Operator-Context-ID"); got != "server-owned-context" {
			t.Fatalf("caller context %q was not replaced by server scope: got %q", callerContextID, got)
		}
		if contextualOperatorContext, ok := OperatorContextIDFromContext(request.Context()); !ok || contextualOperatorContext != "server-owned-context" {
			t.Fatalf("server OperatorContext context not installed: OperatorContext=%q ok=%v", contextualOperatorContext, ok)
		}
	}
}

func TestReferenceReaderFailsClosedWithoutConfiguredServerScope(t *testing.T) {
	configureReferenceAuth(t)
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	request := trustedDshReferenceRequestForTest()
	request.Header.Set("X-Operator-Context-ID", "caller-selected-context")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("trusted DSH request was accepted without the server-owned financial scope")
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "FINANCIAL_SCOPE_NOT_CONFIGURED") {
		t.Fatalf("expected FINANCIAL_SCOPE_NOT_CONFIGURED, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderAcceptsIdentityOperatorContextAndInstallsIt(t *testing.T) {
	configureReferenceAuth(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer user-token" {
			t.Fatalf("unexpected identity authorization %q", r.Header.Get("Authorization"))
		}
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-1", OperatorContextID: "OperatorContext-a", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	response := httptest.NewRecorder()

	if !RequireReferenceReader(response, request) {
		t.Fatalf("Identity session was rejected status=%d body=%s", response.Code, response.Body.String())
	}
	if request.Header.Get("X-Operator-Context-ID") != "OperatorContext-a" {
		t.Fatalf("identity OperatorContext was not installed, got %q", request.Header.Get("X-Operator-Context-ID"))
	}
}

func TestReferenceReaderRejectsHeaderThatConflictsWithIdentity(t *testing.T) {
	configureReferenceAuth(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-2", OperatorContextID: "OperatorContext-b", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	request.Header.Set("X-Operator-Context-ID", "OperatorContext-a")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("client header overrode Identity OperatorContext")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderRejectsIdentityWithoutOperatorContext(t *testing.T) {
	configureReferenceAuth(t)
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(referenceIdentity{
			Subject: "client-3", OperatorContextID: "", AuthState: "authenticated",
		})
	}))
	defer identityServer.Close()
	t.Setenv("IDENTITY_API_BASE_URL", identityServer.URL)
	request := referenceRequest()
	request.Header.Set("Authorization", "Bearer user-token")
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("Identity session without OperatorContext was accepted")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderRejectsMissingIdentitySession(t *testing.T) {
	configureReferenceAuth(t)
	t.Setenv("IDENTITY_API_BASE_URL", "")
	request := referenceRequest()
	response := httptest.NewRecorder()

	if RequireReferenceReader(response, request) {
		t.Fatal("unauthenticated reference read was accepted")
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "IDENTITY_UNAVAILABLE") {
		t.Fatalf("expected IDENTITY_UNAVAILABLE, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestReferenceReaderDoesNotBypassAuthInDeferredMode(t *testing.T) {
	configureReferenceAuth(t)
	request := referenceRequest()
	response := httptest.NewRecorder()
	if RequireReferenceReader(response, request) {
		t.Fatal("deferred unauthenticated reference read was accepted")
	}
}

func TestReferenceReaderAcceptsTrustedDshInDeferredMode(t *testing.T) {
	configureReferenceAuth(t)
	request := trustedDshReferenceRequestForTest()
	request.Header.Set("X-Operator-Context-ID", "caller-selected-deferred-context")
	response := httptest.NewRecorder()
	if !RequireReferenceReader(response, request) {
		t.Fatalf("deferred trusted service read rejected status=%d body=%s", response.Code, response.Body.String())
	}
	if got := request.Header.Get("X-Operator-Context-ID"); got != "server-owned-context" {
		t.Fatalf("deferred caller context was not replaced by server scope: got %q", got)
	}
}
