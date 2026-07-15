package cod

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testDshServiceToken = "test-dsh-service-token"

func TestHandleCreateCodRecordRejectsWhenTokenNotConfigured(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/cod-records", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreateCodRecord(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when WLT_DSH_SERVICE_TOKEN is unset, got %d", rec.Code)
	}
}

func TestHandleCreateCodRecordRequiresServiceAuth(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/cod-records", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreateCodRecord(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandleCreateCodRecordRejectsWrongToken(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/cod-records", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer wrong-token")
	req.Header.Set("X-Service-Caller", "dsh")
	rec := httptest.NewRecorder()

	HandleCreateCodRecord(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for wrong token, got %d", rec.Code)
	}
}

func TestHandleCreateCodRecordRequiresDshCaller(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/cod-records", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+testDshServiceToken)
	req.Header.Set("X-Service-Caller", "partner")
	rec := httptest.NewRecorder()

	HandleCreateCodRecord(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestHandleCreateCommissionRejectsWhenTokenNotConfigured(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/commissions", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreateCommission(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when WLT_DSH_SERVICE_TOKEN is unset, got %d", rec.Code)
	}
}

func TestHandleCreateCommissionRequiresServiceAuth(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/commissions", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreateCommission(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandleCreateCommissionRequiresDshCaller(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", testDshServiceToken)
	req := httptest.NewRequest(http.MethodPost, "/wlt/commissions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+testDshServiceToken)
	req.Header.Set("X-Service-Caller", "partner")
	rec := httptest.NewRecorder()

	HandleCreateCommission(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestCreateCodRecordRejectsMissingFields(t *testing.T) {
	if _, err := CreateCodRecord(nil, CreateCodRecordInput{}); err == nil {
		t.Fatalf("expected error for missing orderId/captainId/partnerId")
	}
}

func TestCreateCodRecordRequiresCheckoutIntentIdBeforeDatabaseLookup(t *testing.T) {
	_, err := CreateCodRecord(nil, CreateCodRecordInput{
		OrderID:   "order-1",
		CaptainID: "captain-1",
		PartnerID: "partner-1",
	})
	if err == nil || !strings.Contains(err.Error(), "checkoutIntentId is required") {
		t.Fatalf("expected checkoutIntentId required error, got %v", err)
	}
}


