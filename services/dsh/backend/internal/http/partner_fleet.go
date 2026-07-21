package http

import (
	"errors"
	"net/http"
	"time"

	"dsh-api/internal/partnerfleet"
	"dsh-api/internal/store"
)

func writePartnerFleetError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, partnerfleet.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "courier connection not found")
	case errors.Is(err, partnerfleet.ErrExpired):
		store.SendError(w, http.StatusGone, "CONNECTION_CODE_EXPIRED", "courier connection code expired")
	case errors.Is(err, partnerfleet.ErrAlreadyBound):
		store.SendError(w, http.StatusConflict, "COURIER_ALREADY_BOUND", "courier or captain identity is already bound")
	case errors.Is(err, partnerfleet.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "courier connection changed; reload before retrying")
	case errors.Is(err, partnerfleet.ErrCourierIneligible):
		store.SendError(w, http.StatusUnprocessableEntity, "COURIER_INELIGIBLE", "team member must be an eligible courier")
	case errors.Is(err, partnerfleet.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid courier connection request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "courier connection action failed")
	}
}

func (s *protectedStoreServer) resolvedPartnerFleetStore(w http.ResponseWriter, r *http.Request) (store.StoreActor, string, bool) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return store.StoreActor{}, "", false
	}
	requestedStoreID := r.PathValue("storeId")
	if requestedStoreID != "" && requestedStoreID != storeID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
		return store.StoreActor{}, "", false
	}
	return actor, storeID, true
}

// POST /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code
func (s *protectedStoreServer) handleIssuePartnerCourierConnectionCode(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.resolvedPartnerFleetStore(w, r)
	if !ok {
		return
	}
	var body struct {
		ExpiresInHours int `json:"expiresInHours"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	ttl := 24 * time.Hour
	if body.ExpiresInHours > 0 {
		ttl = time.Duration(body.ExpiresInHours) * time.Hour
	}
	issued, err := partnerfleet.IssueCode(r.Context(), s.db, storeID, r.PathValue("memberId"), actor.ID, ttl)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	issued.Code = partnerfleet.FormatCodeForDisplay(issued.Code)
	store.SendJSON(w, http.StatusCreated, map[string]any{"issued": issued})
}

// GET /dsh/partner/stores/{storeId}/courier-connections
func (s *protectedStoreServer) handleListPartnerCourierConnections(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.resolvedPartnerFleetStore(w, r)
	if !ok {
		return
	}
	connections, err := partnerfleet.ListStoreConnections(r.Context(), s.db, storeID)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"connections": connections})
}

// POST /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke
func (s *protectedStoreServer) handleRevokePartnerCourierConnection(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.resolvedPartnerFleetStore(w, r)
	if !ok {
		return
	}
	var body struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	connection, err := partnerfleet.RevokeCode(r.Context(), s.db, storeID, r.PathValue("connectionId"), actor.ID, body.ExpectedVersion)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"connection": connection})
}

// POST /dsh/captain/partner-fleet/connect
func (s *protectedStoreServer) handleCaptainConnectPartnerFleet(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	var body struct {
		Code string `json:"code"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	membership, err := partnerfleet.RedeemCode(r.Context(), s.db, actor.ID, body.Code)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"membership": membership})
}

// GET /dsh/captain/partner-fleet/memberships
func (s *protectedStoreServer) handleCaptainPartnerFleetMemberships(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}
	memberships, err := partnerfleet.ListCaptainMemberships(r.Context(), s.db, actor.ID)
	if err != nil {
		writePartnerFleetError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"memberships": memberships})
}
