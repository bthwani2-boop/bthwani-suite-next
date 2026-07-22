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
		Topic           string   `json:"topic"`
		Enabled         bool     `json:"enabled"`
		Channels        []string `json:"channels"`
		QuietHoursStart string   `json:"quietHoursStart"`
		QuietHoursEnd   string   `json:"quietHoursEnd"`
		Locale          string   `json:"locale"`
		Timezone        string   `json:"timezone"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	pref, err := notifications.UpsertNotificationPreferencePolicy(
		s.db,
		actor.ID,
		actor.Role,
		notifications.NotificationPreferenceInput{
			Topic:           body.Topic,
			Enabled:         body.Enabled,
			Channels:        body.Channels,
			QuietHoursStart: body.QuietHoursStart,
			QuietHoursEnd:   body.QuietHoursEnd,
			Locale:          body.Locale,
			Timezone:        body.Timezone,
		},
	)
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "notification preference policy is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update preferences")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"preference": pref})
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
		Topic           string   `json:"topic"`
		ActorTypes      []string `json:"actorTypes"`
		IsEnabled       bool     `json:"isEnabled"`
		Description     string   `json:"description"`
		DefaultChannels []string `json:"defaultChannels"`
		TitleAR         string   `json:"titleAr"`
		BodyAR          string   `json:"bodyAr"`
		TitleEN         string   `json:"titleEn"`
		BodyEN          string   `json:"bodyEn"`
		Variables       []string `json:"variables"`
		DeepLinkPattern string   `json:"deepLinkPattern"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	cfg, err := notifications.UpsertPlatformNotificationConfigPolicy(
		s.db,
		notifications.PlatformNotificationConfigInput{
			Topic:           body.Topic,
			ActorTypes:      body.ActorTypes,
			IsEnabled:       body.IsEnabled,
			Description:     body.Description,
			DefaultChannels: body.DefaultChannels,
			TitleAR:         body.TitleAR,
			BodyAR:          body.BodyAR,
			TitleEN:         body.TitleEN,
			BodyEN:          body.BodyEN,
			Variables:       body.Variables,
			DeepLinkPattern: body.DeepLinkPattern,
		},
		actor.ID,
	)
	if errors.Is(err, notifications.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "notification platform policy is invalid")
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
		"id":              c.ID,
		"topic":           c.Topic,
		"actorTypes":      c.ActorTypes,
		"isEnabled":       c.IsEnabled,
		"description":     c.Description,
		"defaultChannels": c.DefaultChannels,
		"titleAr":         c.TitleAR,
		"bodyAr":          c.BodyAR,
		"titleEn":         c.TitleEN,
		"bodyEn":          c.BodyEN,
		"variables":       c.Variables,
		"deepLinkPattern": c.DeepLinkPattern,
		"updatedBy":       c.UpdatedBy,
		"updatedAt":       c.UpdatedAt,
	}
}
