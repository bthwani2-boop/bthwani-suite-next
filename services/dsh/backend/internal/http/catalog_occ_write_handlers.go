package http

import (
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) upsertStoreAssortmentAtomic(w http.ResponseWriter, r *http.Request, actorID, actorRole, storeID string) {
	masterProductID := r.PathValue("masterProductId")
	var input centralcatalog.StoreAssortmentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	masterProduct, err := centralcatalog.GetMasterProduct(r.Context(), s.db, masterProductID)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	if actorRole != "operator" {
		if masterProduct.ApprovalStatus != "approved" || !masterProduct.IsActive {
			s.writeCatalogMutationError(w, centralcatalog.ErrForbidden)
			return
		}
		input.PublicationStatus = "submitted"
	}
	nodeID := ""
	if masterProduct.CategoryNodeID != nil {
		nodeID = *masterProduct.CategoryNodeID
	}
	policy, err := centralcatalog.ResolveEffectivePolicy(r.Context(), s.db, masterProduct.DomainID, nodeID)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	assortment, err := centralcatalog.UpsertStoreAssortmentAtomic(
		r.Context(), s.db, storeID, masterProductID, actorID, input, policy.AllowsStoreProductCustomImage,
	)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"assortment": assortment})
}

func (s *protectedStoreServer) handleOperatorUpsertStoreAssortmentAtomic(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionAssortmentManage, "operator")
	if !ok {
		return
	}
	s.upsertStoreAssortmentAtomic(w, r, actor.ID, "operator", r.PathValue("storeId"))
}

func (s *protectedStoreServer) handlePartnerUpsertStoreAssortmentAtomic(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
		return
	}
	s.upsertStoreAssortmentAtomic(w, r, actor.ID, actor.Role, storeID)
}

func (s *protectedStoreServer) handleLegacyPartnerUpsertStoreAssortmentAtomic(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	s.upsertStoreAssortmentAtomic(w, r, actor.ID, actor.Role, storeID)
}

func (s *protectedStoreServer) handleFieldUpsertStoreAssortmentAtomic(w http.ResponseWriter, r *http.Request) {
	actorID, storeID, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	if storeID != r.PathValue("storeId") {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to this partner draft")
		return
	}
	s.upsertStoreAssortmentAtomic(w, r, actorID, "field", storeID)
}

func (s *protectedStoreServer) handleLegacyFieldUpsertStoreAssortmentAtomic(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "field")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID); err != nil {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store is outside the field actor scope")
		return
	}
	s.upsertStoreAssortmentAtomic(w, r, actor.ID, actor.Role, storeID)
}

func (s *protectedStoreServer) handleUpdatePartnerProductProposalAtomic(w http.ResponseWriter, r *http.Request) {
	actor, _, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	var input centralcatalog.ProductProposalPatchOCCInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	proposal, err := centralcatalog.UpdateProposalAtomic(r.Context(), s.db, r.PathValue("proposalId"), actor.ID, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": proposal})
}

func (s *protectedStoreServer) handleUpdateFieldProductProposalAtomic(w http.ResponseWriter, r *http.Request) {
	actorID, _, ok := s.fieldPartnerStore(w, r)
	if !ok {
		return
	}
	var input centralcatalog.ProductProposalPatchOCCInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	proposal, err := centralcatalog.UpdateProposalAtomic(r.Context(), s.db, r.PathValue("proposalId"), actorID, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"proposal": proposal})
}

func (s *protectedStoreServer) handleUpdateCatalogAssetAtomic(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	assetID := r.PathValue("assetId")
	if !s.authorizeAssetAccess(w, r, actor, assetID) {
		return
	}
	var input centralcatalog.AssetUpdateOCCInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	asset, err := centralcatalog.UpdateAssetAtomic(r.Context(), s.db, assetID, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": asset})
}

func (s *protectedStoreServer) handleReviewCatalogAssetExpected(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaReview, "operator")
	if !ok {
		return
	}
	var input centralcatalog.AssetReviewInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	asset, err := centralcatalog.ReviewAssetExpected(r.Context(), s.db, actor.ID, r.PathValue("assetId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": asset})
}
