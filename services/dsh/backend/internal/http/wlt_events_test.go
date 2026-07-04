package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testWltServiceToken = "test-wlt-service-token"

func TestRequireWltServiceCallerRejectsWhenTokenNotConfigured(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	if requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to reject when DSH_WLT_SERVICE_TOKEN is unset")
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
}

func TestRequireWltServiceCallerRejectsMissingAuth(t *testing.T) {
	t.Setenv("DSH_WLT_SERVICE_TOKEN", testWltServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	if requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to reject missing Authorization header")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireWltServiceCallerRejectsWrongToken(t *testing.T) {
	t.Setenv("DSH_WLT_SERVICE_TOKEN", testWltServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer wrong-token")
	req.Header.Set("X-Service-Caller", "wlt")
	rec := httptest.NewRecorder()

	if requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to reject wrong token")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestRequireWltServiceCallerRejectsNonWltCaller(t *testing.T) {
	t.Setenv("DSH_WLT_SERVICE_TOKEN", testWltServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+testWltServiceToken)
	req.Header.Set("X-Service-Caller", "partner")
	rec := httptest.NewRecorder()

	if requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to reject non-wlt caller")
	}
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestRequireWltServiceCallerAcceptsWlt(t *testing.T) {
	t.Setenv("DSH_WLT_SERVICE_TOKEN", testWltServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+testWltServiceToken)
	req.Header.Set("X-Service-Caller", "wlt")
	rec := httptest.NewRecorder()

	if !requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to accept wlt caller")
	}
}
