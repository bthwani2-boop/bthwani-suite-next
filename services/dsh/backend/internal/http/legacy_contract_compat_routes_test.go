package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRegisterLegacyContractCompatibilityRoutesRegistersExactMethods(t *testing.T) {
	mux := http.NewServeMux()
	RegisterLegacyContractCompatibilityRoutes(mux, nil, nil, nil, nil)

	tests := []struct {
		method string
		path   string
	}{
		{method: http.MethodPut, path: "/dsh/stores/store-1/images/logo"},
		{method: http.MethodPut, path: "/dsh/partner/catalog/product-proposals/proposal-1"},
		{method: http.MethodPut, path: "/dsh/field/partners/partner-1/catalog/product-proposals/proposal-1"},
		{method: http.MethodGet, path: "/dsh/operator/support/incidents"},
		{method: http.MethodPost, path: "/dsh/operator/support/incidents"},
		{method: http.MethodGet, path: "/dsh/operator/support/incidents/incident-1"},
		{method: http.MethodPatch, path: "/dsh/operator/support/incidents/incident-1"},
		{method: http.MethodGet, path: "/dsh/operator/support/incidents/incident-1/events"},
		{method: http.MethodGet, path: "/dsh/partner/me/finance/cod-records"},
		{method: http.MethodPost, path: "/dsh/partner/me/finance/cod-records/record-1/remit"},
		{method: http.MethodPost, path: "/dsh/operator/workforce/media/uploads"},
		{method: http.MethodPost, path: "/dsh/operator/admin/roles"},
		{method: http.MethodPost, path: "/dsh/operator/admin/partners/partner-1/activate"},
		{method: http.MethodPost, path: "/dsh/operator/admin/partners/partner-1/block"},
		{method: http.MethodPost, path: "/dsh/operator/admin/captains/captain-1/credential"},
	}

	for _, test := range tests {
		t.Run(test.method+" "+test.path, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, nil)
			_, pattern := mux.Handler(req)
			if pattern == "" {
				t.Fatalf("expected route to be registered: %s %s", test.method, test.path)
			}

			wrongMethod := http.MethodGet
			if test.method == http.MethodGet {
				wrongMethod = http.MethodPost
			}
			wrongReq := httptest.NewRequest(wrongMethod, test.path, nil)
			_, wrongPattern := mux.Handler(wrongReq)
			if wrongPattern != "" {
				t.Fatalf("unexpected registration for wrong method %s on %s: %s", wrongMethod, test.path, wrongPattern)
			}
		})
	}
}

func TestRetiredGovernedRoutesFailClosed(t *testing.T) {
	mux := http.NewServeMux()
	RegisterLegacyContractCompatibilityRoutes(mux, nil, nil, nil, nil)

	paths := []string{
		"/dsh/operator/workforce/media/uploads",
		"/dsh/operator/admin/roles",
		"/dsh/operator/admin/partners/partner-1/activate",
		"/dsh/operator/admin/partners/partner-1/block",
		"/dsh/operator/admin/captains/captain-1/credential",
	}

	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			mux.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, path, nil))

			if recorder.Code != http.StatusGone {
				t.Fatalf("expected status %d, got %d", http.StatusGone, recorder.Code)
			}
			if !strings.Contains(recorder.Body.String(), "ROUTE_RETIRED") {
				t.Fatalf("expected governed retirement error, got %s", recorder.Body.String())
			}
		})
	}
}
