package http

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// ── Catalog assets (DAM) ─────────────────────────────────────────────────────

func (s *protectedStoreServer) handleListCatalogAssets(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaRead, "operator"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, total, err := centralcatalog.ListAssets(r.Context(), s.db, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	effectiveLimit, effectiveOffset := centralcatalog.ClampListParams(limit, offset)
	store.SendJSON(w, http.StatusOK, map[string]any{
		"assets": items, "total": total, "limit": effectiveLimit, "offset": effectiveOffset,
	})
}

func (s *protectedStoreServer) handleCreateAssetUploadIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	var input centralcatalog.AssetUploadIntentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	intent, err := centralcatalog.CreateAssetUploadIntent(r.Context(), s.db, s.mediaClient(), actor.ID, sourceSurfaceForActor(actor.Role), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{
		"asset":     intent.Asset,
		"uploadUrl": intent.UploadURL,
		"expiresAt": intent.ExpiresAt,
	})
}

func (s *protectedStoreServer) handleCompleteAssetUpload(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	assetID := r.PathValue("assetId")
	if !s.authorizeAssetAccess(w, r, actor, assetID) {
		return
	}
	a, err := centralcatalog.CompleteAssetUpload(r.Context(), s.db, s.mediaClient(), assetID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": a})
}

func (s *protectedStoreServer) handleUpdateCatalogAsset(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	var input centralcatalog.AssetUpdateInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	assetID := r.PathValue("assetId")
	if !s.authorizeAssetAccess(w, r, actor, assetID) {
		return
	}
	a, err := centralcatalog.UpdateAsset(r.Context(), s.db, assetID, input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": a})
}

func sourceSurfaceForActor(role string) string {
	switch role {
	case "operator":
		return "control-panel-catalog"
	case "partner":
		return "app-partner"
	case "field":
		return "app-field"
	default:
		return "system"
	}
}

func (s *protectedStoreServer) authorizeAssetAccess(w http.ResponseWriter, r *http.Request, actor store.StoreActor, assetID string) bool {
	asset, err := centralcatalog.GetAsset(r.Context(), s.db, assetID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return false
	}
	if actor.Role == "operator" {
		if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
			return false
		}
		return true
	}
	if asset.UploadedBy != actor.ID {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this asset does not belong to you")
		return false
	}
	return true
}

func (s *protectedStoreServer) handleReviewCatalogAsset(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaReview, "operator")
	if !ok {
		return
	}
	var input centralcatalog.AssetReviewInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	a, err := centralcatalog.ReviewAsset(r.Context(), s.db, actor.ID, r.PathValue("assetId"), input)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"asset": a})
}

func (s *protectedStoreServer) handleDeleteCatalogAsset(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	if err := centralcatalog.DeleteUnlinkedAsset(r.Context(), s.db, s.mediaClient(), r.PathValue("assetId")); err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *protectedStoreServer) authorizeAssetLinkEntity(w http.ResponseWriter, r *http.Request, actor store.StoreActor, entityType, entityID string) bool {
	if actor.Role == "operator" {
		return true
	}
	switch entityType {
	case "product_proposal":
		proposal, err := centralcatalog.GetProposal(r.Context(), s.db, entityID)
		if err != nil {
			s.writeCentralCatalogError(w, err)
			return false
		}
		if proposal.SourceActorID != actor.ID {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this product proposal does not belong to you")
			return false
		}
		return true
	case "store_assortment":
		assortment, err := centralcatalog.GetStoreAssortmentByID(r.Context(), s.db, entityID)
		if err != nil {
			s.writeCentralCatalogError(w, err)
			return false
		}
		if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, assortment.StoreID); err != nil {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store assortment does not belong to you")
			return false
		}
		return true
	case "store":
		if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, entityID); err != nil {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
			return false
		}
		return true
	default:
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "only operators can manage media for this entity type")
		return false
	}
}

func (s *protectedStoreServer) handleLinkCatalogAsset(w http.ResponseWriter, r *http.Request) {
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
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"link": link})
}

func (s *protectedStoreServer) handleUnlinkCatalogAsset(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	entityType := r.URL.Query().Get("entityType")
	entityID := r.URL.Query().Get("entityId")
	if !s.authorizeAssetLinkEntity(w, r, actor, entityType, entityID) {
		return
	}
	if assetID, err := s.assetIDForLink(r.Context(), r.PathValue("linkId")); err != nil {
		s.writeCentralCatalogError(w, err)
		return
	} else if !s.authorizeAssetAccess(w, r, actor, assetID) {
		return
	}
	err := centralcatalog.UnlinkAsset(r.Context(), s.db, entityType, entityID, r.PathValue("linkId"))
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"unlinked": true})
}

func (s *protectedStoreServer) assetIDForLink(ctx context.Context, linkID string) (string, error) {
	var assetID string
	if err := s.db.QueryRowContext(ctx, `SELECT asset_id FROM dsh_catalog_asset_links WHERE id=$1`, linkID).Scan(&assetID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", centralcatalog.ErrNotFound
		}
		return "", err
	}
	return assetID, nil
}

func (s *protectedStoreServer) handleListCatalogAssetLinks(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	entityType := r.URL.Query().Get("entityType")
	entityID := r.URL.Query().Get("entityId")
	if !s.authorizeAssetLinkEntity(w, r, actor, entityType, entityID) {
		return
	}
	links, err := centralcatalog.ListAssetLinks(r.Context(), s.db, entityType, entityID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"links": links})
}

func (s *protectedStoreServer) handleSubmitReel(w http.ResponseWriter, r *http.Request) {
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
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"reel": reel})
}

func (s *protectedStoreServer) handleListReels(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaRead, "operator"); !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	reels, err := centralcatalog.ListReels(r.Context(), s.db, r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"reels": reels})
}

func (s *protectedStoreServer) handleReviewReel(w http.ResponseWriter, r *http.Request) {
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
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"reel": reel})
}

func handlePublicReels(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		reels, err := centralcatalog.ListApprovedReels(r.Context(), db, limit)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load reels")
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"reels": reels})
	}
}

func (s *protectedStoreServer) handleCatalogSeedStatus(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionSeedRead, "operator"); !ok {
		return
	}
	status, err := centralcatalog.GetSeedStatus(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, status)
}

func (s *protectedStoreServer) handlePutDomainImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImage(w, r, "domain", r.PathValue("domainId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutNodeImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImage(w, r, "node", r.PathValue("nodeId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutMasterProductImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImage(w, r, "master_product", r.PathValue("productId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutProductProposalImage(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	s.putEntityImage(w, r, "product_proposal", r.PathValue("proposalId"), r.PathValue("role"))
}

func (s *protectedStoreServer) handlePutStoreImage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator", "partner", "field")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	role := r.PathValue("role")
	if !centralcatalog.IsValidStoreImageRole(role) {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid store image role")
		return
	}
	if actor.Role != "operator" {
		if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID); err != nil {
			store.SendError(w, http.StatusForbidden, "FORBIDDEN", "this store does not belong to you")
			return
		}
	}
	s.putEntityImage(w, r, "store", storeID, role)
}

type EntityImageInput struct {
	AssetID string `json:"assetId"`
}

func (s *protectedStoreServer) putEntityImage(w http.ResponseWriter, r *http.Request, entityType, entityID, role string) {
	var input EntityImageInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}

	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	defer tx.Rollback()

	link, err := centralcatalog.ReplacePrimaryAssetLink(r.Context(), tx, centralcatalog.AssetLinkInput{
		AssetID:    input.AssetID,
		EntityType: entityType,
		EntityID:   entityID,
		Role:       role,
		SortOrder:  0,
		IsPrimary:  true,
	})
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}

	if err := tx.Commit(); err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"link": link})
}
