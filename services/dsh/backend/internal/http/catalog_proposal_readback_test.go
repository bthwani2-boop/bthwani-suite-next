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
		path    string
		pattern string
	}{
		{
			path:    "/dsh/partner/catalog/product-proposals",
			pattern: "GET /dsh/partner/catalog/product-proposals",
		},
		{
			path:    "/dsh/field/partners/partner-1/catalog/product-proposals",
			pattern: "GET /dsh/field/partners/{partnerId}/catalog/product-proposals",
		},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			_, pattern := mux.Handler(req)
			if pattern != tc.pattern {
				t.Fatalf("route mismatch: got %q, want %q", pattern, tc.pattern)
			}
		})
	}
}
