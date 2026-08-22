package http

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"dsh-api/internal/partnerteam"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) resolvedPartnerTeamStore(w http.ResponseWriter, r *http.Request) (store.StoreActor, string, bool) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return store.StoreActor{}, "", false
	}
	storeID := strings.TrimSpace(r.PathValue("storeId"))
	if storeID == "" {
		store.SendError(w, http.StatusBadRequest, "STORE_ID_REQUIRED", "storeId is required")
		return store.StoreActor{}, "", false
	}
	row, _, err := store.ResolveActorStoreForID(r.Context(), s.db, actor, storeID)
	if err != nil {
		s.writeStoreError(w, err)
		return store.StoreActor{}, "", false
	}
	return actor, row.ID, true
}

func writePartnerTeamError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, partnerteam.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner team member not found")
	case errors.Is(err, partnerteam.ErrAlreadyBound):
		store.SendError(w, http.StatusConflict, "TEAM_IDENTITY_ALREADY_BOUND", "team identity is already bound")
	case errors.Is(err, partnerteam.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "team member changed; reload before retrying")
	case errors.Is(err, partnerteam.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid partner team request")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "partner team action failed")
	}
}

func (s *protectedStoreServer) handleListPartnerStoreTeam(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.resolvedPartnerTeamStore(w, r)
	if !ok {
		return
	}
	members, err := partnerteam.List(r.Context(), s.db, storeID)
	if err != nil {
		writePartnerTeamError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"members": members})
}

func (s *protectedStoreServer) handleInvitePartnerStoreTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.resolvedPartnerTeamStore(w, r)
	if !ok {
		return
	}
	var body struct {
		Identity string `json:"identity"`
		Role     string `json:"role"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	member, err := partnerteam.Invite(r.Context(), s.db, storeID, body.Identity, body.Role, actor.ID)
	if err != nil {
		writePartnerTeamError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"success": true, "member": member})
}

func (s *protectedStoreServer) handlePartnerStoreTeamMemberAction(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.resolvedPartnerTeamStore(w, r)
	if !ok {
		return
	}
	var body struct {
		Action string `json:"action"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	versionHeader := strings.TrimSpace(r.Header.Get("If-Match-Version"))
	var expectedVersion int
	if _, err := fmt.Sscan(versionHeader, &expectedVersion); err != nil || expectedVersion < 1 {
		store.SendError(w, http.StatusBadRequest, "EXPECTED_VERSION_REQUIRED", "If-Match-Version must be a positive integer")
		return
	}
	member, err := partnerteam.ExecuteAction(
		r.Context(),
		s.db,
		storeID,
		r.PathValue("memberId"),
		actor.ID,
		partnerteam.TeamMemberAction{
			Action:          body.Action,
			ExpectedVersion: expectedVersion,
			IdempotencyKey:  strings.TrimSpace(r.Header.Get("Idempotency-Key")),
			CorrelationID:   strings.TrimSpace(r.Header.Get("X-Correlation-ID")),
		},
	)
	if err != nil {
		writePartnerTeamError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"success": true, "member": member})
}
