package http

import (
	"net/http"

	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// handlePartnerTeamMemberActionAudited is the authenticated multi-surface
// boundary for partner team mutations. Store ownership is verified before the
// request is delegated to the transactional audited handler.
func (s *protectedStoreServer) handlePartnerTeamMemberActionAudited(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	partner.HandleExecuteStoreTeamMemberActionAudited(s.db)(w, partnerRequestWithActor(r, actor))
}
