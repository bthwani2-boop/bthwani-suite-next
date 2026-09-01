package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/clientprofile"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetClientProfile(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}

	profile, err := clientprofile.GetClientProfile(r.Context(), s.db, actor.ID)
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
	mutation, ok := clientProfileMutationContext(w, r)
	if !ok {
		return
	}

	var input clientprofile.ClientProfilePreferencesInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid JSON payload")
		return
	}

	profile, err := clientprofile.UpsertClientProfilePreferences(r.Context(), s.db, actor.ID, input, mutation)
	if err != nil {
		if errors.Is(err, clientprofile.ErrIdempotencyConflict) {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different profile mutation")
			return
		}
		if errors.Is(err, clientprofile.ErrConflict) {
			store.SendError(w, http.StatusConflict, "PROFILE_CONFLICT", "Profile version conflict")
			return
		}
		if errors.Is(err, clientprofile.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Unsupported profile preferences")
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
	mutation, ok := clientProfileMutationContext(w, r)
	if !ok {
		return
	}

	var input clientprofile.ClientProfileConsentsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid JSON payload")
		return
	}

	profile, err := clientprofile.UpsertClientProfileConsents(r.Context(), s.db, actor.ID, input, mutation)
	if err != nil {
		if errors.Is(err, clientprofile.ErrIdempotencyConflict) {
			store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used for a different profile mutation")
			return
		}
		if errors.Is(err, clientprofile.ErrConflict) {
			store.SendError(w, http.StatusConflict, "PROFILE_CONFLICT", "Profile version conflict")
			return
		}
		if errors.Is(err, clientprofile.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Unsupported profile consents")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update consents")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"profile": profile})
}

func (s *protectedStoreServer) handleAdminGetClientProfile(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireAdministrationPermission(w, r, "support.read")
	if !ok {
		return
	}

	actorId := r.PathValue("actorId")
	if actorId == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "Missing actor ID")
		return
	}

	profile, err := clientprofile.GetClientProfile(r.Context(), s.db, actorId)
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

func clientProfileMutationContext(w http.ResponseWriter, r *http.Request) (clientprofile.MutationContext, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 8 and 200 characters")
		return clientprofile.MutationContext{}, false
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if len(correlationID) < 8 || len(correlationID) > 200 {
		store.SendError(w, http.StatusBadRequest, "CORRELATION_ID_REQUIRED", "X-Correlation-ID must contain between 8 and 200 characters")
		return clientprofile.MutationContext{}, false
	}
	return clientprofile.MutationContext{IdempotencyKey: idempotencyKey, CorrelationID: correlationID}, true
}
