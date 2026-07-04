package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequireWltServiceCallerRejectsMissingAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	if requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to reject missing Authorization header")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestRequireWltServiceCallerRejectsNonWltCaller(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer wlt-service")
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
	req := httptest.NewRequest(http.MethodPost, "/dsh/internal/wlt/payment-session-events", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer wlt-service")
	req.Header.Set("X-Service-Caller", "wlt")
	rec := httptest.NewRecorder()

	if !requireWltServiceCaller(rec, req) {
		t.Fatalf("expected requireWltServiceCaller to accept wlt caller")
	}
}
