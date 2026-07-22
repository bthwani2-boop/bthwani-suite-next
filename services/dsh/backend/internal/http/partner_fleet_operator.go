package http

import (
	"database/sql"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/partnerfleet"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// RegisterPartnerFleetOperatorRoutes mounts control-panel readback separately
// from partner and captain mutations so RBAC ownership remains explicit.
func RegisterPartnerFleetOperatorRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	router.HandleFunc(
		"GET /dsh/operator/stores/{storeId}/partner-fleet",
		server.handleOperatorPartnerFleetSnapshot,
	)
}

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
