package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/partner"
	"dsh-api/internal/store"
)

// handlePartnerActivationStatus lets an authenticated partner actor read their own status.
func (s *protectedStoreServer) handlePartnerActivationStatus(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "operator")
	if !ok {
		return
	}
	// partner_id is carried in the actor subject or X-Partner-ID header
	partnerID := r.Header.Get("X-Partner-ID")
	if partnerID == "" {
		partnerID = actor.ID
	}
	p, err := partner.GetByID(s.db, partnerID)
	if err != nil {
		if errors.Is(err, partner.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner profile not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, p)
}

// handlePartnerActivationReadiness lets an authenticated partner actor read their readiness checklist.
func (s *protectedStoreServer) handlePartnerActivationReadiness(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner", "operator")
	if !ok {
		return
	}
	partnerID := r.Header.Get("X-Partner-ID")
	if partnerID == "" {
		partnerID = actor.ID
	}
	readiness, err := partner.GetReadiness(s.db, partnerID)
	if err != nil {
		if errors.Is(err, partner.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner profile not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, readiness)
}
