package http

import (
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleCompleteAssetUploadSafe(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	assetID := r.PathValue("assetId")
	if !s.authorizeAssetAccess(w, r, actor, assetID) {
		return
	}
	asset, err := centralcatalog.CompleteAssetUpload(r.Context(), s.db, s.mediaClient(), assetID)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": asset})
}

func (s *protectedStoreServer) handleDeleteCatalogAssetSafe(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	if err := centralcatalog.DeleteUnlinkedAsset(r.Context(), s.db, s.mediaClient(), r.PathValue("assetId")); err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) handleLinkCatalogAssetSafe(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	var input centralcatalog.AssetLinkInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	input.AssetID = r.PathValue("assetId")
	input.IsPrimary = false
	if !s.authorizeAssetAccess(w, r, actor, input.AssetID) {
		return
	}
	if !s.authorizeAssetLinkEntity(w, r, actor, input.EntityType, input.EntityID) {
		return
	}
	link, err := centralcatalog.LinkAsset(r.Context(), s.db, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"link": link})
}

func (s *protectedStoreServer) handleUnlinkCatalogAssetSafe(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	entityType := r.URL.Query().Get("entityType")
	entityID := r.URL.Query().Get("entityId")
	if !s.authorizeAssetLinkEntity(w, r, actor, entityType, entityID) {
		return
	}
	assetID, err := s.assetIDForLink(r.Context(), r.PathValue("linkId"))
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	if !s.authorizeAssetAccess(w, r, actor, assetID) {
		return
	}
	if err := centralcatalog.UnlinkAsset(r.Context(), s.db, entityType, entityID, r.PathValue("linkId")); err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"unlinked": true})
}

func (s *protectedStoreServer) putEntityImageSafe(
	w http.ResponseWriter,
	r *http.Request,
	entityType, entityID, role string,
) {
	var input EntityImageInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	defer tx.Rollback()

	link, err := centralcatalog.ReplacePrimaryAssetLink(r.Context(), tx, centralcatalog.AssetLinkInput{
		AssetID:   input.AssetID,
		EntityType: entityType,
		EntityID:   entityID,
		Role:       role,
		SortOrder:  0,
		IsPrimary:  true,
	})
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	if err := tx.Commit(); err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"link": link})
}

func (s *protectedStoreServer) handlePutDomainImageSafe(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImageSafe(w, r, "domain", r.PathValue("domainId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutNodeImageSafe(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImageSafe(w, r, "node", r.PathValue("nodeId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutMasterProductImageSafe(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImageSafe(w, r, "master_product", r.PathValue("productId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutProductProposalImageSafe(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImageSafe(w, r, "product_proposal", r.PathValue("proposalId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutStoreImageSafe(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	if actor.Role != "operator" {
		if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID); err != nil {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
			return
		}
	}
	if !centralcatalog.IsValidStoreImageRole(r.PathValue("role")) {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid store image role")
		return
	}
	s.putEntityImageSafe(w, r, "store", storeID, r.PathValue("role"))
}

func (s *protectedStoreServer) handleSubmitReelSafe(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "operator")
	if !ok {
		return
	}
	var input centralcatalog.CreateReelSubmissionInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	reel, err := centralcatalog.CreateReelSubmission(r.Context(), s.db, actor.ID, actor.Role, input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"reel": reel})
}

func (s *protectedStoreServer) handleReviewReelSafe(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaReview, "operator")
	if !ok {
		return
	}
	var input centralcatalog.ReviewReelInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	reel, err := centralcatalog.ReviewReel(r.Context(), s.db, actor.ID, r.PathValue("reelId"), input)
	if err != nil {
		s.writeCatalogMutationError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"reel": reel})
}
