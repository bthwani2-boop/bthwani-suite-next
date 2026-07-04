package cod

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleCreateCodRecordRequiresServiceAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/cod-records", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreateCodRecord(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandleCreateCodRecordRequiresDshCaller(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/cod-records", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer dsh-service")
	req.Header.Set("X-Service-Caller", "partner")
	rec := httptest.NewRecorder()

	HandleCreateCodRecord(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestHandleCreateCommissionRequiresServiceAuth(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/commissions", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()

	HandleCreateCommission(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestHandleCreateCommissionRequiresDshCaller(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/commissions", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer dsh-service")
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
