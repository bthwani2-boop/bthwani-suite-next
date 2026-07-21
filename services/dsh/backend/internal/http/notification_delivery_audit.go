package http

import (
	"net/http"
	"strconv"

	"dsh-api/internal/notifications"
	"dsh-api/internal/store"
)

// GET /dsh/operator/notifications/delivery-attempts
func (s *protectedStoreServer) handleListNotificationDeliveryAttempts(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	limit := 100
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "limit must be an integer")
			return
		}
		limit = parsed
	}
	items, summary, err := notifications.ListDeliveryAttempts(s.db, r.URL.Query().Get("outcome"), limit)
	if err == notifications.ErrInvalid {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "invalid notification delivery audit filter")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list notification delivery attempts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"attempts": items,
		"summary":  summary,
	})
}
