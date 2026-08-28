package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestOtpFailsClosedWithoutTrustedEnrollmentContext(t *testing.T) {
	configureIdentity(t)
	s := &server{}
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/otp/request",
		strings.NewReader(`{"phone":"+967770000001","actorType":"client"}`),
	)
	response := httptest.NewRecorder()

	s.requestOtp(response, request)

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), "ENROLLMENT_CONTEXT_UNRESOLVED") {
		t.Fatalf("unexpected response status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestRequestOtpRejectsProviderSelfServiceIssuance(t *testing.T) {
	configureIdentity(t)
	s := &server{}
	for _, actorType := range []string{"partner", "captain", "field", "employee"} {
		t.Run(actorType, func(t *testing.T) {
			request := httptest.NewRequest(
				http.MethodPost,
				"/auth/otp/request",
				strings.NewReader(`{"phone":"+967770000001","actorType":"`+actorType+`"}`),
			)
			response := httptest.NewRecorder()

			s.requestOtp(response, request)

			if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "PLATFORM_ACCESS_CODE_REQUIRED") {
				t.Fatalf("expected PLATFORM_ACCESS_CODE_REQUIRED, got status=%d body=%s", response.Code, response.Body.String())
			}
		})
	}
}

func TestRequestOtpRejectsInvalidBody(t *testing.T) {
	s := &server{}
	request := httptest.NewRequest(http.MethodPost, "/auth/otp/request", strings.NewReader(`{"actorType":`))
	response := httptest.NewRecorder()
	s.requestOtp(response, request)
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("expected INVALID_REQUEST, got status=%d body=%s", response.Code, response.Body.String())
	}
}
