package http

import (
	"database/sql"
	"errors"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/notifications"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// RegisterActorNotificationRoutes binds the unified notification surface once
// for every authenticated actor. The same shared handlers serve partner,
// client, captain, field and operator surfaces without duplicating transport or
// creating surface-local notification truth.
func RegisterActorNotificationRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/notifications", protected.handleListNotifications)
	mux.HandleFunc("GET /dsh/notifications/preferences", protected.handleListNotificationPreferences)
	mux.HandleFunc("PUT /dsh/notifications/preferences", protected.handleUpdateNotificationPreferences)
	mux.HandleFunc("POST /dsh/notifications/read-all", protected.handleMarkAllNotificationsRead)
	mux.HandleFunc("POST /dsh/notifications/{notificationId}/read", protected.handleMarkNotificationRead)
	mux.HandleFunc("GET /dsh/operator/notifications/config", protected.handleListPlatformNotificationConfig)
	mux.HandleFunc("PUT /dsh/operator/notifications/config", protected.handleUpsertPlatformNotificationConfig)
}

func (s *protectedStoreServer) handleListNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	preferences, err := notifications.ListActorNotificationPreferences(s.db, actor.ID, actor.Role)
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "actor notification context is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list notification preferences")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"preferences": preferences})
}
