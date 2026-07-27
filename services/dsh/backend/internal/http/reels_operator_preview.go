package http

import (
	"errors"
	"io"
	"net/http"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

// handlePreviewOperatorReelMedia streams a reel's unapproved video or poster
// only to an authenticated control-panel actor with catalog media permission.
// Pending moderation assets never become reachable through the public media
// endpoint.
func (s *protectedStoreServer) handlePreviewOperatorReelMedia(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireCatalogPermission(w, r, CatalogPermissionMediaManage, "operator"); !ok {
		return
	}
	client := s.mediaClient()
	if client == nil {
		store.SendError(w, http.StatusServiceUnavailable, "MEDIA_UNAVAILABLE", "media storage is not configured")
		return
	}
	reel, err := centralcatalog.GetReel(r.Context(), s.db, r.PathValue("reelId"))
	if errors.Is(err, centralcatalog.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "reel not found")
		return
	}
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	assetID, err := centralcatalog.ReelMediaAssetID(reel, r.PathValue("kind"))
	if errors.Is(err, centralcatalog.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "reel media not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "unsupported reel media kind")
		return
	}
	asset, err := centralcatalog.GetAsset(r.Context(), s.db, assetID)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	reader, contentType, err := client.Get(r.Context(), asset.ObjectKey)
	if err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "reel media object not found")
		return
	}
	defer reader.Close()
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = io.Copy(w, reader)
}
