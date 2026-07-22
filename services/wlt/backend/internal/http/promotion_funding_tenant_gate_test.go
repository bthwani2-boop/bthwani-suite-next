package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPromotionFundingTenantGate(t *testing.T) {
	t.Parallel()
	next := requirePromotionFundingTenant(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	missing := httptest.NewRecorder()
	next(missing, httptest.NewRequest(http.MethodGet, "/wlt/promotion-funding/reservations/pfr_123", nil))
	if missing.Code != http.StatusBadRequest {
		t.Fatalf("missing tenant status=%d, want %d", missing.Code, http.StatusBadRequest)
	}

	presentRequest := httptest.NewRequest(http.MethodGet, "/wlt/promotion-funding/reservations/pfr_123", nil)
	presentRequest.Header.Set("X-Tenant-ID", "tenant-1")
	present := httptest.NewRecorder()
	next(present, presentRequest)
	if present.Code != http.StatusNoContent {
		t.Fatalf("asserted tenant status=%d, want %d", present.Code, http.StatusNoContent)
	}
}
