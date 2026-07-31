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

type fakeOperatorContextOtpRepository struct {
	operatorContextID string
	input    identity.OtpInput
	result   identity.IssueActivationResult
	err      error
	calls    int
}

func (f *fakeOperatorContextOtpRepository) RequestOtpForOperatorContext(
	_ context.Context,
	operatorContextID string,
	input identity.OtpInput,
) (identity.IssueActivationResult, error) {
	f.calls++
	f.operatorContextID = operatorContextID
	f.input = input
	return f.result, f.err
}

func TestOtpBoundaryUsesTrustedRuntimeOperatorContextForClient(t *testing.T) {
	configureIdentity(t)
	repository := &fakeOperatorContextOtpRepository{
		result: identity.IssueActivationResult{ActivationID: "activation-1", Code: "123456"},
	}
	nextCalled := false
	handler := OtpBoundary(repository, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
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
		t.Fatal("active partner_platform client OTP request fell through to legacy handler")
	}
	if repository.calls != 1 || repository.operatorContextID != "OperatorContext-main" {
		t.Fatalf("unexpected repository call count=%d OperatorContext=%q", repository.calls, repository.operatorContextID)
	}
	if repository.input.Phone != "+967770000001" || repository.input.ActorType != "client" {
		t.Fatalf("unexpected OTP input %#v", repository.input)
	}
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "activation-1") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestOtpBoundaryRejectsProviderSelfServiceIssuance(t *testing.T) {
	configureIdentity(t)
	repository := &fakeOperatorContextOtpRepository{}
	for _, actorType := range []string{"partner", "captain", "field", "employee"} {
		t.Run(actorType, func(t *testing.T) {
			request := httptest.NewRequest(
				http.MethodPost,
				"/auth/otp/request",
				strings.NewReader(`{"phone":"+967770000001","actorType":"`+actorType+`"}`),
			)
			response := httptest.NewRecorder()

			OtpBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

			if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "PLATFORM_ACCESS_CODE_REQUIRED") {
				t.Fatalf("expected PLATFORM_ACCESS_CODE_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
	if repository.calls != 0 {
		t.Fatalf("provider self-service requests must not reach repository; calls=%d", repository.calls)
	}
}

func TestOtpBoundaryRejectsCrossOperatorContextClientPhone(t *testing.T) {
	configureIdentity(t)
	repository := &fakeOperatorContextOtpRepository{err: identity.ErrOperatorContextMismatch}
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	OtpBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestOtpBoundaryPreservesRateLimitError(t *testing.T) {
	configureIdentity(t)
	repository := &fakeOperatorContextOtpRepository{err: identity.ErrActivationRateLimited}
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	OtpBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusTooManyRequests || !strings.Contains(response.Body.String(), "ACTIVATION_RATE_LIMITED") {
		t.Fatalf("expected ACTIVATION_RATE_LIMITED, got status=%d body=%s", response.Code, response.Body.String())
	}
}



func TestOtpBoundaryRejectsInvalidBody(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/auth/otp/request", strings.NewReader(`{"actorType":`))
	response := httptest.NewRecorder()
	OtpBoundary(&fakeOperatorContextOtpRepository{}, http.NotFoundHandler()).ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("expected INVALID_REQUEST, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestOperatorContextOtpErrorFallsBackToInternalError(t *testing.T) {
	response := httptest.NewRecorder()
	writeOperatorContextOtpError(response, errors.New("unexpected"))
	if response.Code != http.StatusInternalServerError || !strings.Contains(response.Body.String(), "IDENTITY_INTERNAL_ERROR") {
		t.Fatalf("expected IDENTITY_INTERNAL_ERROR, got status=%d body=%s", response.Code, response.Body.String())
	}
}
