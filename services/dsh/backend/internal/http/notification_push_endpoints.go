package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/notifications"
	"dsh-api/internal/store"
)

// PUT /dsh/notifications/push-endpoints
func (s *protectedStoreServer) handleUpsertNotificationPushEndpoint(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	var body struct {
		Provider      string `json:"provider"`
		EndpointToken string `json:"endpointToken"`
		DeviceID      string `json:"deviceId"`
		Platform      string `json:"platform"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	endpoint, err := notifications.UpsertPushEndpoint(s.db, actor.ID, actor.Role, notifications.PushEndpointInput{
		Provider:      body.Provider,
		EndpointToken: body.EndpointToken,
		DeviceID:      body.DeviceID,
		Platform:      body.Platform,
	})
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "push endpoint is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register push endpoint")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"endpoint": endpoint})
}

// DELETE /dsh/notifications/push-endpoints/{deviceId}
func (s *protectedStoreServer) handleDeactivateNotificationPushEndpoint(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	err := notifications.DeactivatePushEndpoint(s.db, actor.ID, actor.Role, r.PathValue("deviceId"))
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "device identifier is invalid")
		return
	}
	if notifications.IsPushEndpointNotFound(err) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "push endpoint not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to deactivate push endpoint")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"deactivated": true})
}
