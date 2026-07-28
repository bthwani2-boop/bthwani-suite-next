package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func trustedFinancialRouteTestRequest(t *testing.T, method, path string) *http.Request {
	t.Helper()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-service-token")
	request := httptest.NewRequest(method, path, strings.NewReader(`{}`))
	request.Header.Set("Authorization", "Bearer test-service-token")
	request.Header.Set("X-Service-Caller", "dsh")
	request.Header.Set("X-Tenant-ID", "tenant-retired-route-test")
	return request
}

func TestLegacyLedgerWriteRouteIsNotRegistered(t *testing.T) {
	router := NewRouter(nil, true)
	req := trustedFinancialRouteTestRequest(t, http.MethodPost, "/wlt/ledger/entries")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("legacy ledger write route must stay retired, got HTTP %d: %s", res.Code, res.Body.String())
	}
}

func TestLegacyPartnerPayoutDestinationRoutesAreNotRegistered(t *testing.T) {
	router := NewRouter(nil, true)
	for _, tc := range []struct {
		method string
		path   string
	}{
		{http.MethodPut, "/wlt/payout-destinations/partner-legacy"},
		{http.MethodGet, "/wlt/payout-destinations/partner-legacy"},
		{http.MethodPost, "/wlt/payout-destinations/partner-legacy/deactivate"},
	} {
		req := trustedFinancialRouteTestRequest(t, tc.method, tc.path)
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		if res.Code != http.StatusNotFound {
			t.Fatalf("legacy payout route %s %s must stay retired, got HTTP %d: %s", tc.method, tc.path, res.Code, res.Body.String())
		}
	}
}

func TestUnifiedPayoutDestinationRouteRemainsRegistered(t *testing.T) {
	router := NewRouter(nil, true)
	req := trustedFinancialRouteTestRequest(t, http.MethodPut, "/wlt/payout-destinations/partner/partner-1")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code == http.StatusNotFound {
		t.Fatalf("unified JRN-037 payout destination route must remain registered")
	}
}
