package http

import (
	"net/http"
	"strings"

	"dsh-api/internal/partnerfleet"
	"dsh-api/internal/store"
)

// GET /dsh/operator/stores/{storeId}/partner-fleet
func (s *protectedStoreServer) handleOperatorPartnerFleetSnapshot(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnersPermissionRead, "operator")
	if !ok {
		return
	}

	storeID := strings.TrimSpace(r.PathValue("storeId"))
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "store id is required")
		return
	}

	connections, err := partnerfleet.ListStoreConnections(r.Context(), s.db, storeID)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	members, err := partnerfleet.ListStoreFleetMembers(r.Context(), s.db, storeID)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{
		"storeId":     storeID,
		"connections": connections,
		"members":     members,
	})
}
