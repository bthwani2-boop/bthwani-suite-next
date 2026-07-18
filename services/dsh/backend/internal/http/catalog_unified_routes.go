package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) writeCatalogMutationError(w http.ResponseWriter, err error) {
	var conflict *centralcatalog.ConflictError
	switch {
	case errors.As(err, &conflict):
		store.SendJSON(w, http.StatusConflict, map[string]any{
			"code":            "CONFLICT",
			"message":         conflict.Message,
			"entityId":        conflict.EntityID,
			"expectedVersion": conflict.ExpectedVersion,
			"currentVersion":  conflict.CurrentVersion,
		})
	case errors.Is(err, centralcatalog.ErrConflict):
		store.SendError(w, http.StatusConflict, "CONFLICT", "central catalog version conflict")
	case errors.Is(err, centralcatalog.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "central catalog entity not found")
	case errors.Is(err, centralcatalog.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case errors.Is(err, centralcatalog.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "action not permitted by platform policy")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "central catalog operation failed")
	}
}

func (s *protectedStoreServer) handleUpdateCatalogDomainAtomic(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.DomainPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	domain, err := centralcatalog.UpdateDomainAtomic(r.Context(), s.db, r.PathValue("domainId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"domain": domain})
}

func (s *protectedStoreServer) handleUpdateCatalogNodeAtomic(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.NodePatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	node, err := centralcatalog.UpdateNodeAtomic(r.Context(), s.db, r.PathValue("nodeId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"node": node})
}

func (s *protectedStoreServer) handleUpdateCatalogMasterProductAtomic(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProductManage, "operator"); !ok {
		return
	}
	var input centralcatalog.MasterProductPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	product, err := centralcatalog.UpdateMasterProductAtomic(r.Context(), s.db, r.PathValue("productId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"masterProduct": product})
}

func (s *protectedStoreServer) handleUpdateCatalogPlatformPolicyAtomic(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionPolicyManage, "operator"); !ok {
		return
	}
	var input centralcatalog.CatalogPolicyPatchInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	policy, err := centralcatalog.UpdateCatalogPolicyAtomic(r.Context(), s.db, r.PathValue("policyId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

// registerUnifiedCatalogRoutes binds the exact paths consumed by the shared
// multi-surface client. The shorter /dsh/catalog paths remain available as a
// compatibility surface in server.go.
func registerUnifiedCatalogRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	// Operator taxonomy, products, proposals, policies and assortment.
	mux.HandleFunc("GET /dsh/operator/catalog/domains", s.handleListCatalogDomains)
	mux.HandleFunc("POST /dsh/operator/catalog/domains", s.handleCreateCatalogDomain)
	mux.HandleFunc("PATCH /dsh/operator/catalog/domains/{domainId}", s.handleUpdateCatalogDomainAtomic)
	mux.HandleFunc("GET /dsh/operator/catalog/nodes", s.handleListCatalogNodes)
	mux.HandleFunc("POST /dsh/operator/catalog/nodes", s.handleCreateCatalogNode)
	mux.HandleFunc("PATCH /dsh/operator/catalog/nodes/{nodeId}", s.handleUpdateCatalogNodeAtomic)
	mux.HandleFunc("GET /dsh/operator/catalog/master-products", s.handleListCatalogMasterProducts)
	mux.HandleFunc("POST /dsh/operator/catalog/master-products", s.handleCreateCatalogMasterProduct)
	mux.HandleFunc("PATCH /dsh/operator/catalog/master-products/{productId}", s.handleUpdateCatalogMasterProductAtomic)
	mux.HandleFunc("GET /dsh/operator/catalog/product-proposals", s.handleListCatalogProposals)
	mux.HandleFunc("POST /dsh/operator/catalog/product-proposals/{proposalId}/decision", s.handleDecideCatalogProposalExpected)
	mux.HandleFunc("POST /dsh/operator/catalog/product-proposals/{proposalId}/transition", s.handleTransitionCatalogProposalExpected)
	mux.HandleFunc("GET /dsh/operator/catalog/platform-policies", s.handleListCatalogPlatformPolicies)
	mux.HandleFunc("PATCH /dsh/operator/catalog/platform-policies/{policyId}", s.handleUpdateCatalogPlatformPolicyAtomic)
	mux.HandleFunc("PUT /dsh/operator/catalog/platform-policies/{policyId}", s.handleUpdateCatalogPlatformPolicyAtomic)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/assortment", s.handleGetOperatorStoreAssortment)
	mux.HandleFunc("PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}", s.handleOperatorUpsertStoreAssortmentAtomic)

	// Partner and field taxonomy and store-scoped catalog operations.
	mux.HandleFunc("GET /dsh/partner/catalog/taxonomy", s.handleCatalogTaxonomy)
	mux.HandleFunc("POST /dsh/partner/catalog/product-proposals", s.handlePartnerCreateProductProposal)
	mux.HandleFunc("PATCH /dsh/partner/catalog/product-proposals/{proposalId}", s.handleUpdatePartnerProductProposalAtomic)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/assortment", s.handlePartnerGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}", s.handlePartnerUpsertStoreAssortmentAtomic)
	mux.HandleFunc("GET /dsh/field/catalog/taxonomy", s.handleCatalogTaxonomy)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/catalog/product-proposals", s.handleFieldCreateProductProposal)
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", s.handleUpdateFieldProductProposalAtomic)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/assortment", s.handleFieldGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}", s.handleFieldUpsertStoreAssortmentAtomic)

	// Seed diagnostics and digital-asset management.
	mux.HandleFunc("GET /dsh/operator/catalog/seed-status", s.handleCatalogSeedStatus)
	mux.HandleFunc("GET /dsh/operator/catalog/assets", s.handleListCatalogAssets)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/upload-intents", s.handleCreateAssetUploadIntent)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/complete", s.handleCompleteAssetUploadSafe)
	mux.HandleFunc("PATCH /dsh/operator/catalog/assets/{assetId}", s.handleUpdateCatalogAssetAtomic)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/review", s.handleReviewCatalogAssetExpected)
	mux.HandleFunc("DELETE /dsh/operator/catalog/assets/{assetId}", s.handleDeleteCatalogAssetSafe)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/link", s.handleLinkCatalogAssetSafe)
	mux.HandleFunc("DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}", s.handleUnlinkCatalogAssetSafe)
	mux.HandleFunc("GET /dsh/operator/catalog/asset-links", s.handleListCatalogAssetLinks)
	mux.HandleFunc("PUT /dsh/operator/catalog/domains/{domainId}/images/{role}", s.handlePutDomainImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}", s.handlePutNodeImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/master-products/{productId}/images/{role}", s.handlePutMasterProductImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}", s.handlePutProductProposalImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/stores/{storeId}/images/{role}", s.handlePutStoreImageSafe)

	// Governed short-video submissions.
	mux.HandleFunc("POST /dsh/partner/reels", s.handleSubmitReelSafe)
	mux.HandleFunc("GET /dsh/operator/reels", s.handleListReels)
	mux.HandleFunc("POST /dsh/operator/reels/{reelId}/review", s.handleReviewReelSafe)
}
