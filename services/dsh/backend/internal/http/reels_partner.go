package http

import (
	"net/http"
	"strconv"
	"strings"

	"dsh-api/internal/centralcatalog"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleListPartnerReels(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := strings.TrimSpace(r.URL.Query().Get("storeId"))
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId is required")
		return
	}
	if _, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID); err != nil {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "store is not owned by this partner actor")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	items, err := centralcatalog.ListPartnerReels(r.Context(), s.db, actor.ID, storeID, limit, offset)
	if err != nil {
		s.writeCentralCatalogError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"reels": items})
}
