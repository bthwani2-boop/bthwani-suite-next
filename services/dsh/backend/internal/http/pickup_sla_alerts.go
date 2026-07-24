package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/pickup"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleRefreshPickupSLAAlerts(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PickupPermissionManage, "operator")
	if !ok {
		return
	}
	correlationID := operationalCorrelationID(r, "")
	result, err := pickup.RefreshPickupSLAAlerts(s.db, correlationID, time.Now().UTC())
	if errors.Is(err, pickup.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid alert refresh request")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to refresh pickup SLA alerts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"result": result})
}

func (s *protectedStoreServer) handleListPickupSLAAlerts(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PickupPermissionRead, "operator")
	if !ok {
		return
	}
	limit := 100
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 500 {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "limit must be between 1 and 500")
			return
		}
		limit = parsed
	}
	status := pickup.SLAAlertStatus(strings.TrimSpace(r.URL.Query().Get("status")))
	alerts, err := pickup.ListPickupSLAAlerts(s.db, status, limit)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list pickup SLA alerts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alerts": alerts, "total": len(alerts)})
}

func (s *protectedStoreServer) handleAcknowledgePickupSLAAlert(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PickupPermissionManage, "operator")
	if !ok {
		return
	}
	alertID := strings.TrimSpace(r.PathValue("alertId"))
	var body struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	alert, err := pickup.AcknowledgePickupSLAAlert(s.db, pickup.AcknowledgePickupSLAAlertInput{
		AlertID:         alertID,
		ActorID:         actor.ID,
		ExpectedVersion: body.ExpectedVersion,
	})
	if errors.Is(err, pickup.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "alertId and expectedVersion are required")
		return
	}
	if errors.Is(err, pickup.ErrVersionConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "pickup SLA alert changed or is no longer open")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to acknowledge pickup SLA alert")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alert": alert})
}
