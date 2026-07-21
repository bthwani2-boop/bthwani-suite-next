package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/centralcatalog"
)

func TestUnifiedCatalogRoutesAreRegistered(t *testing.T) {
	t.Parallel()

	mux := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodGet, "/dsh/operator/catalog/domains", "GET /dsh/operator/catalog/domains"},
		{http.MethodPost, "/dsh/operator/catalog/domains", "POST /dsh/operator/catalog/domains"},
		{http.MethodPatch, "/dsh/operator/catalog/domains/domain-1", "PATCH /dsh/operator/catalog/domains/{domainId}"},
		{http.MethodGet, "/dsh/operator/catalog/nodes", "GET /dsh/operator/catalog/nodes"},
		{http.MethodPost, "/dsh/operator/catalog/nodes", "POST /dsh/operator/catalog/nodes"},
		{http.MethodPatch, "/dsh/operator/catalog/nodes/node-1", "PATCH /dsh/operator/catalog/nodes/{nodeId}"},
		{http.MethodGet, "/dsh/operator/catalog/master-products", "GET /dsh/operator/catalog/master-products"},
		{http.MethodPost, "/dsh/operator/catalog/master-products", "POST /dsh/operator/catalog/master-products"},
		{http.MethodPatch, "/dsh/operator/catalog/master-products/product-1", "PATCH /dsh/operator/catalog/master-products/{productId}"},
		{http.MethodGet, "/dsh/operator/catalog/product-proposals", "GET /dsh/operator/catalog/product-proposals"},
		{http.MethodPost, "/dsh/operator/catalog/product-proposals/proposal-1/decision", "POST /dsh/operator/catalog/product-proposals/{proposalId}/decision"},
		{http.MethodPost, "/dsh/operator/catalog/product-proposals/proposal-1/transition", "POST /dsh/operator/catalog/product-proposals/{proposalId}/transition"},
		{http.MethodGet, "/dsh/operator/catalog/platform-policies", "GET /dsh/operator/catalog/platform-policies"},
		{http.MethodPatch, "/dsh/operator/catalog/platform-policies/policy-1", "PATCH /dsh/operator/catalog/platform-policies/{policyId}"},
		{http.MethodPut, "/dsh/operator/catalog/platform-policies/policy-1", "PUT /dsh/operator/catalog/platform-policies/{policyId}"},
		{http.MethodGet, "/dsh/operator/stores/store-1/assortment", "GET /dsh/operator/stores/{storeId}/assortment"},
		{http.MethodPut, "/dsh/operator/stores/store-1/assortment/product-1", "PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}"},
		{http.MethodGet, "/dsh/operator/catalog/seed-status", "GET /dsh/operator/catalog/seed-status"},
		{http.MethodGet, "/dsh/operator/catalog/assets", "GET /dsh/operator/catalog/assets"},
		{http.MethodPost, "/dsh/operator/catalog/assets/upload-intents", "POST /dsh/operator/catalog/assets/upload-intents"},
		{http.MethodPost, "/dsh/operator/catalog/assets/asset-1/complete", "POST /dsh/operator/catalog/assets/{assetId}/complete"},
		{http.MethodPatch, "/dsh/operator/catalog/assets/asset-1", "PATCH /dsh/operator/catalog/assets/{assetId}"},
		{http.MethodPost, "/dsh/operator/catalog/assets/asset-1/review", "POST /dsh/operator/catalog/assets/{assetId}/review"},
		{http.MethodDelete, "/dsh/operator/catalog/assets/asset-1", "DELETE /dsh/operator/catalog/assets/{assetId}"},
		{http.MethodPost, "/dsh/operator/catalog/assets/asset-1/link", "POST /dsh/operator/catalog/assets/{assetId}/link"},
		{http.MethodDelete, "/dsh/operator/catalog/assets/asset-1/links/link-1", "DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}"},
		{http.MethodGet, "/dsh/operator/catalog/asset-links", "GET /dsh/operator/catalog/asset-links"},
		{http.MethodPut, "/dsh/operator/catalog/domains/domain-1/images/icon", "PUT /dsh/operator/catalog/domains/{domainId}/images/{role}"},
		{http.MethodPut, "/dsh/operator/catalog/nodes/node-1/images/icon", "PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}"},
		{http.MethodPut, "/dsh/operator/catalog/master-products/product-1/images/canonical", "PUT /dsh/operator/catalog/master-products/{productId}/images/{role}"},
		{http.MethodPut, "/dsh/operator/catalog/product-proposals/proposal-1/images/proposal", "PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}"},
		{http.MethodPut, "/dsh/operator/catalog/stores/store-1/images/logo", "PUT /dsh/operator/catalog/stores/{storeId}/images/{role}"},
		{http.MethodGet, "/dsh/partner/catalog/taxonomy", "GET /dsh/partner/catalog/taxonomy"},
		{http.MethodGet, "/dsh/partner/catalog/master-products", "GET /dsh/partner/catalog/master-products"},
		{http.MethodPost, "/dsh/partner/catalog/product-proposals", "POST /dsh/partner/catalog/product-proposals"},
		{http.MethodGet, "/dsh/partner/stores/store-1/assortment", "GET /dsh/partner/stores/{storeId}/assortment"},
		{http.MethodPut, "/dsh/partner/stores/store-1/assortment/product-1", "PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}"},
		{http.MethodGet, "/dsh/field/catalog/taxonomy", "GET /dsh/field/catalog/taxonomy"},
		{http.MethodGet, "/dsh/field/catalog/master-products", "GET /dsh/field/catalog/master-products"},
		{http.MethodPost, "/dsh/field/partners/partner-1/catalog/product-proposals", "POST /dsh/field/partners/{partnerId}/catalog/product-proposals"},
		{http.MethodGet, "/dsh/field/partners/partner-1/assortment", "GET /dsh/field/partners/{partnerId}/assortment"},
		{http.MethodPut, "/dsh/field/partners/partner-1/stores/store-1/assortment/product-1", "PUT /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}"},
		{http.MethodPost, "/dsh/partner/reels", "POST /dsh/partner/reels"},
		{http.MethodGet, "/dsh/operator/reels", "GET /dsh/operator/reels"},
		{http.MethodPost, "/dsh/operator/reels/reel-1/review", "POST /dsh/operator/reels/{reelId}/review"},
		{http.MethodPatch, "/dsh/catalog/domains/domain-1", "PATCH /dsh/catalog/domains/{domainId}"},
		{http.MethodPatch, "/dsh/catalog/nodes/node-1", "PATCH /dsh/catalog/nodes/{nodeId}"},
		{http.MethodPatch, "/dsh/catalog/master-products/product-1", "PATCH /dsh/catalog/master-products/{productId}"},
		{http.MethodPatch, "/dsh/catalog/policies/policy-1", "PATCH /dsh/catalog/policies/{policyId}"},
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

func TestCatalogConflictResponseIsStructured409(t *testing.T) {
	t.Parallel()

	expected := 4
	recorder := httptest.NewRecorder()
	server := &protectedStoreServer{}
	server.writeCatalogMutationError(recorder, &centralcatalog.ConflictError{
		EntityID:        "domain-1",
		ExpectedVersion: &expected,
		CurrentVersion:  5,
		Message:         "version mismatch",
	})

	if recorder.Code != http.StatusConflict {
		t.Fatalf("status mismatch: got %d, want %d", recorder.Code, http.StatusConflict)
	}
	var body struct {
		Code            string `json:"code"`
		EntityID        string `json:"entityId"`
		ExpectedVersion int    `json:"expectedVersion"`
		CurrentVersion  int    `json:"currentVersion"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Code != "CONFLICT" || body.EntityID != "domain-1" || body.ExpectedVersion != 4 || body.CurrentVersion != 5 {
		t.Fatalf("unexpected conflict body: %+v", body)
	}
}
