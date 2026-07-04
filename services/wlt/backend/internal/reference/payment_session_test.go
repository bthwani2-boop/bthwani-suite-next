package reference

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleCreatePaymentSessionRequiresServiceAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandleCreatePaymentSessionRequiresDshCaller(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer dsh-service")
	req.Header.Set("X-Service-Caller", "partner")
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestHandleCreatePaymentSessionRequiresIdempotencyAndCorrelation(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer dsh-service")
	req.Header.Set("X-Service-Caller", "dsh")
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}
