package http

import (
	"net/http"
	"net/http/httptest"
	"sort"
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

	allowedMethods := make(map[string]map[string]struct{})
	for _, test := range tests {
		if allowedMethods[test.path] == nil {
			allowedMethods[test.path] = make(map[string]struct{})
		}
		allowedMethods[test.path][test.method] = struct{}{}
	}

	for _, test := range tests {
		t.Run(test.method+" "+test.path, func(t *testing.T) {
			req := httptest.NewRequest(test.method, test.path, nil)
			_, pattern := mux.Handler(req)
			if pattern == "" {
				t.Fatalf("expected route to be registered: %s %s", test.method, test.path)
			}
		})
	}

	candidateMethods := []string{
		http.MethodGet,
		http.MethodPost,
		http.MethodPut,
		http.MethodPatch,
		http.MethodDelete,
	}
	paths := make([]string, 0, len(allowedMethods))
	for path := range allowedMethods {
		paths = append(paths, path)
	}
	sort.Strings(paths)

	for _, path := range paths {
		wrongMethod := ""
		for _, candidate := range candidateMethods {
			if _, allowed := allowedMethods[path][candidate]; !allowed {
				wrongMethod = candidate
				break
			}
		}
		if wrongMethod == "" {
			t.Fatalf("test configuration has no unsupported method for %s", path)
		}

		t.Run("reject "+wrongMethod+" "+path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			mux.ServeHTTP(recorder, httptest.NewRequest(wrongMethod, path, nil))
			if recorder.Code != http.StatusMethodNotAllowed {
				t.Fatalf("expected status %d for unsupported method %s on %s, got %d", http.StatusMethodNotAllowed, wrongMethod, path, recorder.Code)
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
