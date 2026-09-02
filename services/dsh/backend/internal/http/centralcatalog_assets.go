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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaRead); !ok {
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
	idempotencyKey, ok := requireCatalogCreateIdempotency(w, r)
	if !ok {
		return
	}
	var input centralcatalog.AssetUploadIntentInput
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	intent, err := centralcatalog.CreateAssetUploadIntent(r.Context(), s.db, s.mediaClient(), actor.ID, sourceSurfaceForActor(actor.Role), idempotencyKey, input)
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
		if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage); !ok {
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

func (s *protectedStoreServer) handleListReels(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaRead); !ok {
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
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionSeedRead); !ok {
		return
	}
	status, err := centralcatalog.GetSeedStatus(r.Context(), s.db)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, status)
}

type EntityImageInput struct {
	AssetID string `json:"assetId"`
}
