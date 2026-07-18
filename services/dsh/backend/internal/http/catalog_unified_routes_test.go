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
		{http.MethodPatch, "/dsh/catalog/domains/domain-1", "PATCH /dsh/catalog/domains/{domainId}"},
		{http.MethodPatch, "/dsh/operator/catalog/domains/domain-1", "PATCH /dsh/operator/catalog/domains/{domainId}"},
		{http.MethodGet, "/dsh/operator/catalog/product-proposals", "GET /dsh/operator/catalog/product-proposals"},
		{http.MethodPut, "/dsh/operator/catalog/platform-policies/policy-1", "PUT /dsh/operator/catalog/platform-policies/{policyId}"},
		{http.MethodGet, "/dsh/operator/catalog/assets", "GET /dsh/operator/catalog/assets"},
		{http.MethodGet, "/dsh/partner/catalog/taxonomy", "GET /dsh/partner/catalog/taxonomy"},
		{http.MethodPut, "/dsh/partner/stores/store-1/assortment/product-1", "PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}"},
		{http.MethodGet, "/dsh/field/catalog/taxonomy", "GET /dsh/field/catalog/taxonomy"},
		{http.MethodPost, "/dsh/field/partners/partner-1/catalog/product-proposals", "POST /dsh/field/partners/{partnerId}/catalog/product-proposals"},
		{http.MethodPost, "/dsh/partner/reels", "POST /dsh/partner/reels"},
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
