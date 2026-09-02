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
	case errors.Is(err, centralcatalog.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used for different catalog inputs")
	case errors.Is(err, centralcatalog.ErrIdempotencyRequired):
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_REQUIRED", "Idempotency-Key is required for catalog create operations")
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionTaxonomyManage); !ok {
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionProductManage); !ok {
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionPolicyManage); !ok {
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

// registerUnifiedCatalogRoutes is the final protected-route extension point.
// Independent bounded registrars are composed before catalog-specific routes.
func registerUnifiedCatalogRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	registerDeliveryProofRoutes(mux, s)
	registerRepresentativeFinanceRoutes(mux, s)
	registerRefundFinanceRoutes(mux, s)
	registerCatalogApprovalRoutes(mux, s)

	// Canonical order-truth routes.
	mux.HandleFunc("POST /dsh/client/order-truth", s.handleCreateOrderTruth)
	mux.HandleFunc("GET /dsh/client/order-truth", s.handleListClientOrderTruth)
	mux.HandleFunc("GET /dsh/client/order-truth/{orderId}", s.handleGetClientOrderTruth)
	mux.HandleFunc("GET /dsh/client/order-truth/{orderId}/events", s.handleListClientOrderTruthEvents)
	mux.HandleFunc("GET /dsh/partner/order-truth", s.handleListPartnerOrderTruth)
	mux.HandleFunc("GET /dsh/partner/order-truth/{orderId}", s.handleGetPartnerOrderTruth)
	mux.HandleFunc("GET /dsh/operator/order-truth", s.withPermission("control-panel", OperationsPermissionRead, s.handleListOperatorOrderTruth))
	mux.HandleFunc("GET /dsh/operator/order-truth/diagnostics", s.withPermission("control-panel", OperationsPermissionRead, s.handleGetOrderTruthDiagnostics))
	mux.HandleFunc("GET /dsh/operator/order-truth/{orderId}", s.withPermission("control-panel", OperationsPermissionRead, s.handleGetOperatorOrderTruth))

	// Sovereign operational policy truth. withPermission is what authenticates
	// the caller and places the actor in the request context; these handlers
	// resolve the actor with ActorFromContext and return silently when it is
	// absent, so registering them bare answered 200 with an empty body instead
	// of 401/403 and made the capability unusable.
	mux.HandleFunc("GET /dsh/operator/platform/zones", s.withPermission("control-panel", DshServiceZonesPermissionRead, s.handleListZones))
	mux.HandleFunc("GET /dsh/operator/platform/serviceability/{zoneId}", s.withPermission("control-panel", DshServiceZonesPermissionRead, s.handleGetZoneServiceability))

	// Operator taxonomy, products, attributes, relationships, proposals,
	// policies, assortments, audit and rollback.
	mux.HandleFunc("GET /dsh/operator/catalog/domains", s.handleListCatalogDomains)
	mux.HandleFunc("POST /dsh/operator/catalog/domains", s.handleCreateCatalogDomain)
	mux.HandleFunc("PATCH /dsh/operator/catalog/domains/{domainId}", s.handleUpdateCatalogDomainAtomic)
	mux.HandleFunc("GET /dsh/operator/catalog/nodes", s.handleListCatalogNodes)
	mux.HandleFunc("POST /dsh/operator/catalog/nodes", s.handleCreateCatalogNode)
	mux.HandleFunc("PATCH /dsh/operator/catalog/nodes/{nodeId}", s.handleUpdateCatalogNodeAtomic)
	mux.HandleFunc("POST /dsh/operator/catalog/nodes/{nodeId}/move", s.handleMoveCatalogNode)
	mux.HandleFunc("POST /dsh/operator/catalog/nodes/{nodeId}/merge", s.handleMergeCatalogNode)
	mux.HandleFunc("POST /dsh/operator/catalog/nodes/{nodeId}/deprecate", s.handleDeprecateCatalogNode)
	mux.HandleFunc("GET /dsh/operator/catalog/attributes", s.handleListCatalogAttributes)
	mux.HandleFunc("POST /dsh/operator/catalog/attributes", s.handleCreateCatalogAttribute)
	mux.HandleFunc("GET /dsh/operator/catalog/attributes/{attributeId}/options", s.handleListCatalogAttributeOptions)
	mux.HandleFunc("POST /dsh/operator/catalog/attributes/{attributeId}/options", s.handleCreateCatalogAttributeOption)
	mux.HandleFunc("PUT /dsh/operator/catalog/nodes/{nodeId}/attributes/{attributeId}", s.handleUpsertCatalogNodeAttributeRule)
	mux.HandleFunc("GET /dsh/operator/catalog/master-products", s.handleListCatalogMasterProducts)
	mux.HandleFunc("POST /dsh/operator/catalog/master-products", s.handleCreateCatalogMasterProduct)
	mux.HandleFunc("GET /dsh/operator/catalog/master-products/{productId}", s.handleGetCatalogMasterProduct)
	mux.HandleFunc("PATCH /dsh/operator/catalog/master-products/{productId}", s.handleUpdateCatalogMasterProductAtomic)
	mux.HandleFunc("GET /dsh/operator/catalog/master-products/{productId}/attribute-values", s.handleListMasterProductAttributeValues)
	mux.HandleFunc("PUT /dsh/operator/catalog/master-products/{productId}/attribute-values/{attributeId}", s.handleUpsertMasterProductAttributeValue)
	mux.HandleFunc("GET /dsh/operator/catalog/master-products/{productId}/relationships", s.handleListMasterProductRelationships)
	mux.HandleFunc("PUT /dsh/operator/catalog/master-products/{productId}/relationships", s.handleUpsertMasterProductRelationship)
	mux.HandleFunc("DELETE /dsh/operator/catalog/master-products/{productId}/relationships/{relationshipId}", s.handleDeleteMasterProductRelationship)
	mux.HandleFunc("GET /dsh/operator/catalog/product-proposals", s.handleListCatalogProposals)
	mux.HandleFunc("POST /dsh/operator/catalog/product-proposals/{proposalId}/transition", s.handleTransitionCatalogProposalExpected)
	mux.HandleFunc("GET /dsh/operator/catalog/platform-policies", s.handleListCatalogPlatformPolicies)
	mux.HandleFunc("PATCH /dsh/operator/catalog/platform-policies/{policyId}", s.handleUpdateCatalogPlatformPolicyAtomic)
	mux.HandleFunc("PUT /dsh/operator/catalog/platform-policies/{policyId}", s.handleUpdateCatalogPlatformPolicyAtomic)
	mux.HandleFunc("GET /dsh/operator/catalog/audit", s.handleListCatalogAudit)
	mux.HandleFunc("POST /dsh/operator/catalog/audit/{auditId}/rollback", s.handleRollbackCatalogAudit)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/assortment", s.handleGetOperatorStoreAssortment)
	mux.HandleFunc("PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}", s.handleOperatorUpsertStoreAssortmentAtomic)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/assortment-pauses", s.handleListOperatorAssortmentPauses)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/pause", s.handlePauseOperatorAssortment)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/resume", s.handleResumeOperatorAssortment)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/retire", s.handleRetireOperatorAssortment)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/assortment/{masterProductId}/inventory", s.handleOperatorGetAssortmentInventory)
	mux.HandleFunc("PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}/inventory", s.handleOperatorUpsertAssortmentInventory)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/assortment/{masterProductId}/prices", s.handleOperatorListAssortmentPrices)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/prices", s.handleOperatorCreateAssortmentPrice)

	// Partner and field taxonomy and store-scoped catalog operations.
	mux.HandleFunc("GET /dsh/partner/catalog/taxonomy", s.handleCatalogTaxonomy)
	mux.HandleFunc("GET /dsh/partner/catalog/attributes", s.handleListCatalogAttributes)
	mux.HandleFunc("GET /dsh/partner/catalog/attributes/{attributeId}/options", s.handleListCatalogAttributeOptions)
	mux.HandleFunc("GET /dsh/partner/catalog/master-products/{productId}/attribute-values", s.handleListMasterProductAttributeValues)
	mux.HandleFunc("GET /dsh/partner/catalog/master-products/{productId}/relationships", s.handleListMasterProductRelationships)
	mux.HandleFunc("GET /dsh/partner/catalog/product-proposals", s.handleListPartnerProductProposals)
	mux.HandleFunc("POST /dsh/partner/catalog/product-proposals", s.handlePartnerCreateProductProposal)
	mux.HandleFunc("PATCH /dsh/partner/catalog/product-proposals/{proposalId}", s.handleUpdatePartnerProductProposalAtomic)
	mux.HandleFunc("POST /dsh/partner/catalog/product-proposals/{proposalId}/withdraw", s.handleWithdrawPartnerProductProposalAtomic)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/assortment", s.handlePartnerGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}", s.handlePartnerUpsertStoreAssortmentAtomic)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/assortment-pauses", s.handleListPartnerAssortmentPauses)
	mux.HandleFunc("POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/pause", s.handlePausePartnerAssortment)
	mux.HandleFunc("POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/resume", s.handleResumePartnerAssortment)
	mux.HandleFunc("POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/retire", s.handleRetirePartnerAssortment)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/assortment/{masterProductId}/inventory", s.handlePartnerGetAssortmentInventory)
	mux.HandleFunc("PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}/inventory", s.handlePartnerUpsertAssortmentInventory)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/assortment/{masterProductId}/prices", s.handlePartnerListAssortmentPrices)
	mux.HandleFunc("POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/prices", s.handlePartnerCreateAssortmentPrice)
	mux.HandleFunc("GET /dsh/field/catalog/taxonomy", s.handleCatalogTaxonomy)
	mux.HandleFunc("GET /dsh/field/catalog/attributes", s.handleListCatalogAttributes)
	mux.HandleFunc("GET /dsh/field/catalog/attributes/{attributeId}/options", s.handleListCatalogAttributeOptions)
	mux.HandleFunc("GET /dsh/field/catalog/master-products/{productId}/attribute-values", s.handleListMasterProductAttributeValues)
	mux.HandleFunc("GET /dsh/field/catalog/master-products/{productId}/relationships", s.handleListMasterProductRelationships)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/catalog/product-proposals", s.handleListFieldProductProposals)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/catalog/product-proposals", s.handleFieldCreateProductProposal)
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", s.handleUpdateFieldProductProposalAtomic)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}/withdraw", s.handleWithdrawFieldProductProposalAtomic)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/assortment", s.handleFieldGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}", s.handleFieldUpsertStoreAssortmentAtomic)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/batch", s.handleFieldUpsertStoreAssortmentBatch)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/assortment-pauses", s.handleListFieldAssortmentPauses)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/assortment/{masterProductId}/pause", s.handlePauseFieldAssortment)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/assortment/{masterProductId}/resume", s.handleResumeFieldAssortment)

	// Seed diagnostics and digital-asset management.
	mux.HandleFunc("GET /dsh/operator/catalog/seed-status", s.handleCatalogSeedStatus)
	mux.HandleFunc("GET /dsh/operator/catalog/assets", s.handleListCatalogAssets)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/upload-intents", s.handleCreateAssetUploadIntent)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/complete", s.handleCompleteAssetUploadSafe)
	mux.HandleFunc("PATCH /dsh/operator/catalog/assets/{assetId}", s.handleUpdateCatalogAssetAtomic)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/review", s.handleReviewCatalogAssetExpected)
	mux.HandleFunc("DELETE /dsh/operator/catalog/assets/{assetId}", s.handleDeleteCatalogAssetSafe)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/cleanup-orphans", s.handleCleanupOrphanCatalogAssets)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/simulate-scan", s.handleSimulateAssetScan)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/link", s.handleLinkCatalogAssetSafe)
	mux.HandleFunc("DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}", s.handleUnlinkCatalogAssetSafe)
	mux.HandleFunc("GET /dsh/operator/catalog/asset-links", s.handleListCatalogAssetLinks)
	mux.HandleFunc("PUT /dsh/operator/catalog/domains/{domainId}/images/{role}", s.handlePutDomainImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}", s.handlePutNodeImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/master-products/{productId}/images/{role}", s.handlePutMasterProductImageSafe)
}
