package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/centralcatalog"
)

func TestCatalogGenericConflictIsHTTP409(t *testing.T) {
	t.Parallel()

	recorder := httptest.NewRecorder()
	server := &protectedStoreServer{}
	server.writeCatalogMutationError(recorder, centralcatalog.ErrConflict)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("status mismatch: got %d, want %d", recorder.Code, http.StatusConflict)
	}
	var body struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Code != "CONFLICT" {
		t.Fatalf("code mismatch: got %q, want CONFLICT", body.Code)
	}
}

func TestUnifiedCatalogRoutesUseConflictSafeHandlers(t *testing.T) {
	t.Parallel()

	routes := readCatalogContractFixture(t, "catalog_unified_routes.go")
	required := []string{
		"handleCompleteAssetUploadSafe",
		"handleDeleteCatalogAssetSafe",
		"handleLinkCatalogAssetSafe",
		"handleUnlinkCatalogAssetSafe",
		"handlePutDomainImageSafe",
		"handlePutNodeImageSafe",
		"handlePutMasterProductImageSafe",
		"handlePutProductProposalImageSafe",
		"handlePutStoreImageSafe",
		"handleSubmitReelSafe",
		"handleReviewReelSafe",
	}
	for _, name := range required {
		if !strings.Contains(routes, name) {
			t.Fatalf("unified routes must use %s", name)
		}
	}
	for _, stale := range []string{
		"s.handleCompleteAssetUpload)",
		"s.handleDeleteCatalogAsset)",
		"s.handleLinkCatalogAsset)",
		"s.handleUnlinkCatalogAsset)",
		"s.handlePutDomainImage)",
		"s.handlePutNodeImage)",
		"s.handlePutMasterProductImage)",
		"s.handlePutProductProposalImage)",
		"s.handlePutStoreImage)",
		"s.handleSubmitReel)",
		"s.handleReviewReel)",
	} {
		if strings.Contains(routes, stale) {
			t.Fatalf("unified routes still use conflict-unsafe handler %s", stale)
		}
	}
}
