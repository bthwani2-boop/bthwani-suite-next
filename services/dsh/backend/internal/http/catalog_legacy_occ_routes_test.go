package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLegacyCatalogWriteRoutesRemainRegistered(t *testing.T) {
	t.Parallel()

	mux := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodPut, "/dsh/catalog/stores/store-1/assortment/product-1", "PUT /dsh/catalog/stores/{storeId}/assortment/{masterProductId}"},
		{http.MethodPut, "/dsh/field/catalog/stores/store-1/assortment/product-1", "PUT /dsh/field/catalog/stores/{storeId}/assortment/{masterProductId}"},
		{http.MethodPut, "/dsh/partner/catalog/assortment/product-1", "PUT /dsh/partner/catalog/assortment/{masterProductId}"},
		{http.MethodPatch, "/dsh/partner/catalog/product-proposals/proposal-1", "PATCH /dsh/partner/catalog/product-proposals/{proposalId}"},
		{http.MethodPatch, "/dsh/field/partners/partner-1/catalog/product-proposals/proposal-1", "PATCH /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}"},
	}

	for _, tc := range cases {
		t.Run(tc.method+" "+tc.path, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			_, pattern := mux.Handler(req)
			if pattern != tc.pattern {
				t.Fatalf("route mismatch: got %q, want %q", pattern, tc.pattern)
			}
		})
	}
}
