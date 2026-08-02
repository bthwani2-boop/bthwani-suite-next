package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func partnerPermissionRequest() *http.Request {
	return httptest.NewRequest(http.MethodGet, "/internal/partner/permission-bundles", nil)
}

func configuredPartnerPermissionRequest() *http.Request {
	request := partnerPermissionRequest()
	request.Header.Set("Authorization", "Bearer dsh-secret")
	request.Header.Set("X-Service-Caller", "dsh")
	request.Header.Set("X-Operator-Context-ID", "operator-main")
	return request
}

func TestPartnerPermissionBundlesRejectPublicCaller(t *testing.T) {
	response := httptest.NewRecorder()
	(&partnerAccessServer{}).dshOnly(http.NotFoundHandler().ServeHTTP)(response, partnerPermissionRequest())
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "FORBIDDEN") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPartnerPermissionBundlesRequireDedicatedDshToken(t *testing.T) {
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "")
	request := partnerPermissionRequest()
	request.Header.Set("X-Service-Caller", "dsh")
	response := httptest.NewRecorder()

	(&partnerAccessServer{}).dshOnly(http.NotFoundHandler().ServeHTTP)(response, request)

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "INTERNAL_API_UNAVAILABLE") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPartnerPermissionBundlesRejectInvalidDshToken(t *testing.T) {
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "dsh-secret")
	request := configuredPartnerPermissionRequest()
	request.Header.Set("Authorization", "Bearer wrong-secret")
	response := httptest.NewRecorder()

	(&partnerAccessServer{}).dshOnly(http.NotFoundHandler().ServeHTTP)(response, request)

	if response.Code != http.StatusUnauthorized || !strings.Contains(response.Body.String(), "UNAUTHENTICATED") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPartnerPermissionBundlesRejectMismatchedOperatorContext(t *testing.T) {
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "dsh-secret")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	request := configuredPartnerPermissionRequest()
	request.Header.Set("X-Operator-Context-ID", "operator-other")
	response := httptest.NewRecorder()

	(&partnerAccessServer{}).dshOnly(http.NotFoundHandler().ServeHTTP)(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPartnerPermissionBundlesDelegateAuthenticatedDsh(t *testing.T) {
	t.Setenv("IDENTITY_DSH_SERVICE_TOKEN", "dsh-secret")
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "operator-main")
	called := false
	handler := (&partnerAccessServer{}).dshOnly(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	})
	response := httptest.NewRecorder()

	handler(response, configuredPartnerPermissionRequest())

	if !called || response.Code != http.StatusNoContent {
		t.Fatalf("authenticated DSH request was not delegated status=%d called=%v", response.Code, called)
	}
}
