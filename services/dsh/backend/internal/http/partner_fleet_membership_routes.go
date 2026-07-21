package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/partnerfleet"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// RegisterPartnerFleetMembershipRoutes mounts the captain-owned mutation that
// is intentionally separate from the legacy partner-fleet compatibility routes.
func RegisterPartnerFleetMembershipRoutes(
	router *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	server := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	router.HandleFunc(
		"POST /dsh/captain/partner-fleet/memberships/{teamMemberId}/disconnect",
		server.handleCaptainDisconnectPartnerFleetMembership,
	)
}

func (s *protectedStoreServer) handleCaptainDisconnectPartnerFleetMembership(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		StoreID         string `json:"storeId"`
		ExpectedVersion int    `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	membership, err := partnerfleet.DisconnectCaptainMembership(
		r.Context(),
		s.db,
		actor.ID,
		body.StoreID,
		r.PathValue("teamMemberId"),
		body.ExpectedVersion,
	)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"membership": membership})
}
