package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"identity-api/internal/identity"
)

type fakeTenantOtpRepository struct {
	tenantID string
	input    identity.OtpInput
	result   identity.IssueActivationResult
	err      error
	calls    int
}

func (f *fakeTenantOtpRepository) RequestOtpForTenant(
	_ context.Context,
	tenantID string,
	input identity.OtpInput,
) (identity.IssueActivationResult, error) {
	f.calls++
	f.tenantID = tenantID
	f.input = input
	return f.result, f.err
}

func TestSaaSOtpBoundaryUsesTrustedRuntimeTenantForClient(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeTenantOtpRepository{
		result: identity.IssueActivationResult{ActivationID: "activation-1", Code: "123456"},
	}
	nextCalled := false
	handler := SaaSOtpBoundary(repository, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if nextCalled {
		t.Fatal("active SaaS client OTP request fell through to legacy handler")
	}
	if repository.calls != 1 || repository.tenantID != "tenant-main" {
		t.Fatalf("unexpected repository call count=%d tenant=%q", repository.calls, repository.tenantID)
	}
	if repository.input.Phone != "+967770000001" || repository.input.ActorType != "client" {
		t.Fatalf("unexpected OTP input %#v", repository.input)
	}
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "activation-1") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOtpBoundaryRejectsProviderSelfServiceIssuance(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeTenantOtpRepository{}
	for _, actorType := range []string{"partner", "captain", "field", "employee"} {
		t.Run(actorType, func(t *testing.T) {
			request := httptest.NewRequest(
				http.MethodPost,
				"/auth/otp/request",
				strings.NewReader(`{"phone":"+967770000001","actorType":"`+actorType+`"}`),
			)
			response := httptest.NewRecorder()

			SaaSOtpBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

			if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "PLATFORM_ACCESS_CODE_REQUIRED") {
				t.Fatalf("expected PLATFORM_ACCESS_CODE_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
	if repository.calls != 0 {
		t.Fatalf("provider self-service requests must not reach repository; calls=%d", repository.calls)
	}
}

func TestSaaSOtpBoundaryRejectsCrossTenantClientPhone(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeTenantOtpRepository{err: identity.ErrTenantMismatch}
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	SaaSOtpBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOtpBoundaryPreservesRateLimitError(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeTenantOtpRepository{err: identity.ErrActivationRateLimited}
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	SaaSOtpBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusTooManyRequests || !strings.Contains(response.Body.String(), "ACTIVATION_RATE_LIMITED") {
		t.Fatalf("expected ACTIVATION_RATE_LIMITED, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOtpBoundaryUsesExplicitDeferredTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "local-dsh")
	repository := &fakeTenantOtpRepository{
		result: identity.IssueActivationResult{ActivationID: "activation-local", Code: "123456"},
	}
	nextCalled := false
	handler := SaaSOtpBoundary(repository, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if nextCalled {
		t.Fatal("deferred client OTP request reached the legacy handler")
	}
	if repository.calls != 1 || repository.tenantID != "local-dsh" {
		t.Fatalf("expected explicit deferred tenant, calls=%d tenant=%q", repository.calls, repository.tenantID)
	}
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "activation-local") {
		t.Fatalf("unexpected deferred response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOtpBoundaryFailsClosedWithoutDeferredTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	t.Setenv("BTHWANI_DEFAULT_TENANT_ID", "")
	repository := &fakeTenantOtpRepository{}
	nextCalled := false
	handler := SaaSOtpBoundary(repository, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if nextCalled || repository.calls != 0 {
		t.Fatalf("missing deferred tenant must fail closed, next=%v calls=%d", nextCalled, repository.calls)
	}
	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "SAAS_RUNTIME_CONFIG_INVALID") {
		t.Fatalf("expected SAAS_RUNTIME_CONFIG_INVALID, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestSaaSOtpBoundaryRejectsInvalidBody(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/auth/otp/request", strings.NewReader(`{"actorType":`))
	response := httptest.NewRecorder()
	SaaSOtpBoundary(&fakeTenantOtpRepository{}, http.NotFoundHandler()).ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("expected INVALID_REQUEST, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestTenantOtpErrorFallsBackToInternalError(t *testing.T) {
	response := httptest.NewRecorder()
	writeTenantOtpError(response, errors.New("unexpected"))
	if response.Code != http.StatusInternalServerError || !strings.Contains(response.Body.String(), "IDENTITY_INTERNAL_ERROR") {
		t.Fatalf("expected IDENTITY_INTERNAL_ERROR, got status=%d body=%s", response.Code, response.Body.String())
	}
}
