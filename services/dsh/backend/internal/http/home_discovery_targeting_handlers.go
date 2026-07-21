package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/homediscovery"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleHomeDiscoveryAdminTargetingGet(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator")
	if !ok {
		return
	}
	targeting, err := homediscovery.ListAdminTargeting(
		r.Context(), s.db, r.PathValue("kind"), r.PathValue("itemId"),
	)
	if errors.Is(err, homediscovery.ErrAdminContentNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"targeting": targeting})
}

func (s *protectedStoreServer) handleHomeDiscoveryAdminTargetingPut(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var input homediscovery.AdminTargeting
	if !decodeProtectedJSON(w, r, &input) {
		return
	}
	targeting, err := homediscovery.ReplaceAdminTargeting(
		r.Context(),
		s.db,
		r.PathValue("kind"),
		r.PathValue("itemId"),
		actor.ID,
		r.Header.Get("X-Correlation-ID"),
		input,
	)
	if errors.Is(err, homediscovery.ErrAdminContentNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"targeting": targeting})
}
