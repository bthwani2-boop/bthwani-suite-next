package reference

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testDshServiceToken = "test-dsh-service-token"

func TestHandleCreatePaymentSessionRejectsWhenTokenNotConfigured(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when WLT_DSH_SERVICE_TOKEN is unset, got %d", rec.Code)
	}
}

func TestHandleCreatePaymentSessionRequiresServiceAuth(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandleCreatePaymentSessionRejectsWrongToken(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer wrong-token")
	req.Header.Set("X-Service-Caller", "dsh")
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for wrong token, got %d", rec.Code)
	}
}

func TestHandleCreatePaymentSessionRequiresDshCaller(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+testDshServiceToken)
	req.Header.Set("X-Service-Caller", "partner")
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestHandleCreatePaymentSessionRequiresIdempotencyAndCorrelation(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/payment-sessions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+testDshServiceToken)
	req.Header.Set("X-Service-Caller", "dsh")
	rec := httptest.NewRecorder()

	HandleCreatePaymentSession(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestCreatePaymentSessionRejectsNonPositiveAmount(t *testing.T) {
	cases := []int64{0, -1, -100}
	for _, amount := range cases {
		_, err := CreatePaymentSession(nil, CreatePaymentSessionInput{
			CheckoutIntentID: "intent-1",
			ClientID:         "client-1",
			StoreID:          "store-1",
			PaymentMethod:    "cod",
			AmountMinorUnits: amount,
		})
		if err == nil {
			t.Fatalf("expected error for amountMinorUnits=%d, got nil", amount)
		}
	}
}
