package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCatalogProposalReadbackRoutesAreRegistered(t *testing.T) {
	t.Parallel()

	mux := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		name    string
		method  string
		path    string
		pattern string
	}{
		{
			name:    "partner proposal history",
			method:  http.MethodGet,
			path:    "/dsh/partner/catalog/product-proposals?status=submitted&limit=25",
			pattern: "GET /dsh/partner/catalog/product-proposals",
		},
		{
			name:    "partner query cannot select a different route scope",
			method:  http.MethodGet,
			path:    "/dsh/partner/catalog/product-proposals?storeId=forged-store&offset=0",
			pattern: "GET /dsh/partner/catalog/product-proposals",
		},
		{
			name:    "field scoped partner proposal history",
			method:  http.MethodGet,
			path:    "/dsh/field/partners/partner-1/catalog/product-proposals?offset=0",
			pattern: "GET /dsh/field/partners/{partnerId}/catalog/product-proposals",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			_, pattern := mux.Handler(req)
			if pattern != tc.pattern {
				t.Fatalf("route mismatch: got %q, want %q", pattern, tc.pattern)
			}
		})
	}
}
