package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// ─── Partner team management (app-partner surface) ─────────────────────────
// These handlers serve the partner's own team-management screen.
// Store ownership is verified via store.ActorCanAccessStore before any mutation,
// preventing cross-partner IDOR.

// handlePartnerListTeamMembers lists all team members for the requesting
// partner's store. Cross-partner IDOR is prevented by the ActorCanAccessStore check.
func (s *protectedStoreServer) handlePartnerListTeamMembers(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, s.workforce, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	members, err := partner.ListStoreTeamMembers(s.db, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list team members")
		return
	}
	writePartnerJSON(w, http.StatusOK, map[string]any{"members": members})
}

// handlePartnerInviteTeamMember creates a pending invite for a new team member.
func (s *protectedStoreServer) handlePartnerInviteTeamMember(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, s.workforce, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}

	var input partner.InviteTeamMemberInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}
	input.InvitedByActorID = actor.ID

	if err := partner.InviteStoreTeamMember(s.db, storeID, input); err != nil {
		if errors.Is(err, partner.ErrInvalid) {
			store.SendError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "invalid invite: identity and role are required")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to invite team member")
		return
	}
	writePartnerJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

// handlePartnerTeamMemberAction executes a status-change action on a team member.
// Cross-partner IDOR is prevented by the ActorCanAccessStore check and the store_id
// guard inside ExecuteStoreTeamMemberAction itself.
func (s *protectedStoreServer) handlePartnerTeamMemberAction(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := r.PathValue("storeId")
	memberID := r.PathValue("memberId")
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, s.workforce, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}

	var input partner.TeamMemberActionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}
	input.ActorID = actor.ID

	if err := partner.ExecuteStoreTeamMemberAction(s.db, storeID, memberID, input); err != nil {
		if errors.Is(err, partner.ErrInvalid) {
			store.SendError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "unsupported team action")
			return
		}
		if errors.Is(err, partner.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "team member not found in this store")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to execute team action")
		return
	}
	writePartnerJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// writePartnerJSON serializes body as JSON with the given HTTP status.
func writePartnerJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
