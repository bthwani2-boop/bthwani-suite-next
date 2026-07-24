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

func TestSaaSOtpBoundaryUsesTrustedRuntimeTenant(t *testing.T) {
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
		t.Fatal("active SaaS OTP request fell through to legacy handler")
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

func TestSaaSOtpBoundaryRejectsCrossTenantPhone(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeTenantOtpRepository{err: identity.ErrTenantMismatch}
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"partner"}`),
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

func TestSaaSOtpBoundaryPassesThroughWhenDeferred(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	repository := &fakeTenantOtpRepository{}
	nextCalled := false
	handler := SaaSOtpBoundary(repository, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))
	request := httptest.NewRequest(http.MethodPost, "/auth/otp/request", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if !nextCalled || repository.calls != 0 || response.Code != http.StatusNoContent {
		t.Fatalf("expected deferred passthrough called=%v calls=%d status=%d", nextCalled, repository.calls, response.Code)
	}
}

func TestTenantOtpErrorFallsBackToInternalError(t *testing.T) {
	response := httptest.NewRecorder()
	writeTenantOtpError(response, errors.New("unexpected"))
	if response.Code != http.StatusInternalServerError || !strings.Contains(response.Body.String(), "IDENTITY_INTERNAL_ERROR") {
		t.Fatalf("expected IDENTITY_INTERNAL_ERROR, got status=%d body=%s", response.Code, response.Body.String())
	}
}
