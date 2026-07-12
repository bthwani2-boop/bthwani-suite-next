package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/notifications"
	"dsh-api/internal/store"
)

// GET /dsh/notifications
func (s *protectedStoreServer) handleListNotifications(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	items, unread, err := notifications.ListActorNotifications(s.db, actor.ID, actor.Role, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list notifications")
		return
	}
	result := make([]map[string]any, 0, len(items))
	for _, n := range items {
		result = append(result, marshalNotification(n))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"notifications": result,
		"unreadCount":   unread,
	})
}

// POST /dsh/notifications/{notificationId}/read
func (s *protectedStoreServer) handleMarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	nid := r.PathValue("notificationId")
	n, err := notifications.MarkNotificationRead(s.db, nid, actor.ID)
	if errors.Is(err, notifications.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "notification not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to mark read")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"notification": marshalNotification(n)})
}

// POST /dsh/notifications/read-all
func (s *protectedStoreServer) handleMarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	count, err := notifications.MarkAllNotificationsRead(s.db, actor.ID, actor.Role)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to mark all read")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"markedCount": count})
}

// PUT /dsh/notifications/preferences
func (s *protectedStoreServer) handleUpdateNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "field", "operator")
	if !ok {
		return
	}
	var body struct {
		Topic   string `json:"topic"`
		Enabled bool   `json:"enabled"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	pref, err := notifications.UpsertNotificationPreferences(s.db, actor.ID, actor.Role, body.Topic, body.Enabled)
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "topic is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update preferences")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"preference": map[string]any{
		"actorId":   pref.ActorID,
		"actorType": pref.ActorType,
		"topic":     pref.Topic,
		"enabled":   pref.Enabled,
		"updatedAt": pref.UpdatedAt,
	}})
}

// GET /dsh/operator/notifications/config
func (s *protectedStoreServer) handleListPlatformNotificationConfig(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	configs, err := notifications.ListPlatformNotificationConfigs(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list configs")
		return
	}
	result := make([]map[string]any, 0, len(configs))
	for _, c := range configs {
		result = append(result, marshalNotificationConfig(c))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"configs": result})
}

// PUT /dsh/operator/notifications/config
func (s *protectedStoreServer) handleUpsertPlatformNotificationConfig(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Topic       string   `json:"topic"`
		ActorTypes  []string `json:"actorTypes"`
		IsEnabled   bool     `json:"isEnabled"`
		Description string   `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	cfg, err := notifications.UpsertPlatformNotificationConfig(s.db,
		body.Topic, body.ActorTypes, body.IsEnabled, body.Description, actor.ID)
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "topic is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to save config")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"config": marshalNotificationConfig(cfg)})
}

func marshalNotification(n notifications.Notification) map[string]any {
	m := map[string]any{
		"id":        n.ID,
		"actorId":   n.ActorID,
		"actorType": n.ActorType,
		"topic":     n.Topic,
		"title":     n.Title,
		"body":      n.Body,
		"actionUrl": n.ActionURL,
		"isRead":    n.IsRead,
		"createdAt": n.CreatedAt,
	}
	if n.ReadAt != nil {
		m["readAt"] = n.ReadAt
	}
	return m
}

func marshalNotificationConfig(c notifications.PlatformNotificationConfig) map[string]any {
	return map[string]any{
		"id":          c.ID,
		"topic":       c.Topic,
		"actorTypes":  c.ActorTypes,
		"isEnabled":   c.IsEnabled,
		"description": c.Description,
		"updatedBy":   c.UpdatedBy,
		"updatedAt":   c.UpdatedAt,
	}
}
