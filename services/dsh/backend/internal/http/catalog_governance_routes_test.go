package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN008CatalogGovernanceRoutesAreRegistered(t *testing.T) {
	t.Parallel()
	mux := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodGet, "/dsh/operator/catalog/attributes", "GET /dsh/operator/catalog/attributes"},
		{http.MethodPost, "/dsh/operator/catalog/attributes", "POST /dsh/operator/catalog/attributes"},
		{http.MethodGet, "/dsh/operator/catalog/attributes/attr-1/options", "GET /dsh/operator/catalog/attributes/{attributeId}/options"},
		{http.MethodPost, "/dsh/operator/catalog/attributes/attr-1/options", "POST /dsh/operator/catalog/attributes/{attributeId}/options"},
		{http.MethodPut, "/dsh/operator/catalog/nodes/node-1/attributes/attr-1", "PUT /dsh/operator/catalog/nodes/{nodeId}/attributes/{attributeId}"},
		{http.MethodGet, "/dsh/operator/catalog/master-products/mp-1/attribute-values", "GET /dsh/operator/catalog/master-products/{productId}/attribute-values"},
		{http.MethodPut, "/dsh/operator/catalog/master-products/mp-1/attribute-values/attr-1", "PUT /dsh/operator/catalog/master-products/{productId}/attribute-values/{attributeId}"},
		{http.MethodGet, "/dsh/operator/catalog/master-products/mp-1/relationships", "GET /dsh/operator/catalog/master-products/{productId}/relationships"},
		{http.MethodPut, "/dsh/operator/catalog/master-products/mp-1/relationships", "PUT /dsh/operator/catalog/master-products/{productId}/relationships"},
		{http.MethodDelete, "/dsh/operator/catalog/master-products/mp-1/relationships/rel-1?expectedVersion=1", "DELETE /dsh/operator/catalog/master-products/{productId}/relationships/{relationshipId}"},
		{http.MethodGet, "/dsh/operator/stores/store-1/assortment-pauses", "GET /dsh/operator/stores/{storeId}/assortment-pauses"},
		{http.MethodPost, "/dsh/operator/stores/store-1/assortment/mp-1/pause", "POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/pause"},
		{http.MethodPost, "/dsh/operator/stores/store-1/assortment/mp-1/resume", "POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/resume"},
		{http.MethodGet, "/dsh/operator/catalog/audit", "GET /dsh/operator/catalog/audit"},
		{http.MethodPost, "/dsh/operator/catalog/audit/audit-1/rollback", "POST /dsh/operator/catalog/audit/{auditId}/rollback"},
		{http.MethodGet, "/dsh/partner/catalog/attributes", "GET /dsh/partner/catalog/attributes"},
		{http.MethodGet, "/dsh/partner/catalog/master-products/mp-1/relationships", "GET /dsh/partner/catalog/master-products/{productId}/relationships"},
		{http.MethodGet, "/dsh/partner/stores/store-1/assortment-pauses", "GET /dsh/partner/stores/{storeId}/assortment-pauses"},
		{http.MethodPost, "/dsh/partner/stores/store-1/assortment/mp-1/pause", "POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/pause"},
		{http.MethodPost, "/dsh/partner/stores/store-1/assortment/mp-1/resume", "POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/resume"},
		{http.MethodGet, "/dsh/field/catalog/attributes", "GET /dsh/field/catalog/attributes"},
		{http.MethodGet, "/dsh/field/catalog/master-products/mp-1/attribute-values", "GET /dsh/field/catalog/master-products/{productId}/attribute-values"},
		{http.MethodGet, "/dsh/field/partners/partner-1/assortment-pauses", "GET /dsh/field/partners/{partnerId}/assortment-pauses"},
		{http.MethodPost, "/dsh/field/partners/partner-1/assortment/mp-1/pause", "POST /dsh/field/partners/{partnerId}/assortment/{masterProductId}/pause"},
		{http.MethodPost, "/dsh/field/partners/partner-1/assortment/mp-1/resume", "POST /dsh/field/partners/{partnerId}/assortment/{masterProductId}/resume"},
	}
	for _, tc := range cases {
		t.Run(tc.pattern, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			_, pattern := mux.Handler(req)
			if pattern != tc.pattern {
				t.Fatalf("route mismatch for %s %s: got %q, want %q", tc.method, tc.path, pattern, tc.pattern)
			}
		})
	}
}
