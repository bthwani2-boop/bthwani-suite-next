package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/clientprofile"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetClientProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}

	profile, err := clientprofile.GetClientProfile(s.db, actor.ID)
	if err != nil {
		if errors.Is(err, clientprofile.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Client profile not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve profile")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}

func (s *protectedStoreServer) handleUpsertClientProfilePreferences(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}

	var input clientprofile.ClientProfilePreferencesInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid JSON payload")
		return
	}

	profile, err := clientprofile.UpsertClientProfilePreferences(s.db, actor.ID, input)
	if err != nil {
		if errors.Is(err, clientprofile.ErrConflict) {
			store.SendError(w, http.StatusConflict, "PROFILE_CONFLICT", "Profile version conflict")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update preferences")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}

func (s *protectedStoreServer) handleUpsertClientProfileConsents(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}

	var input clientprofile.ClientProfileConsentsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid JSON payload")
		return
	}

	profile, err := clientprofile.UpsertClientProfileConsents(s.db, actor.ID, input)
	if err != nil {
		if errors.Is(err, clientprofile.ErrConflict) {
			store.SendError(w, http.StatusConflict, "PROFILE_CONFLICT", "Profile version conflict")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update consents")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}

func (s *protectedStoreServer) handleAdminGetClientProfile(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "administration.read")
	if !ok {
		return
	}

	actorId := r.PathValue("actorId")
	if actorId == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Missing actor ID")
		return
	}

	profile, err := clientprofile.GetClientProfile(s.db, actorId)
	if err != nil {
		if errors.Is(err, clientprofile.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Client profile not found")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve profile")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}
