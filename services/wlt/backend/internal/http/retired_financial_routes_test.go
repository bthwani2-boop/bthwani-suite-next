package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLegacyLedgerWriteRouteIsNotRegistered(t *testing.T) {
	router := NewRouter(nil, true)
	req := httptest.NewRequest(http.MethodPost, "/wlt/ledger/entries", strings.NewReader(`{}`))
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
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{}`))
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		if res.Code != http.StatusNotFound {
			t.Fatalf("legacy payout route %s %s must stay retired, got HTTP %d: %s", tc.method, tc.path, res.Code, res.Body.String())
		}
	}
}

func TestUnifiedPayoutDestinationRouteRemainsRegistered(t *testing.T) {
	router := NewRouter(nil, true)
	req := httptest.NewRequest(http.MethodPut, "/wlt/payout-destinations/partner/partner-1", strings.NewReader(`{}`))
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code == http.StatusNotFound {
		t.Fatalf("unified JRN-037 payout destination route must remain registered")
	}
}
