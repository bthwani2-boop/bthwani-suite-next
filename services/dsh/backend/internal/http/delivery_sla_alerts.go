package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleRefreshDeliverySLAAlerts(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionManage, "operator")
	if !ok {
		return
	}
	correlationID := operationalCorrelationID(r, "")
	result, err := partnerdelivery.RefreshDeliverySLAAlerts(s.db, correlationID, time.Now().UTC())
	if errors.Is(err, partnerdelivery.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid alert refresh request")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to refresh delivery SLA alerts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"result": result})
}

func (s *protectedStoreServer) handleListDeliverySLAAlerts(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionRead, "operator")
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
	status := partnerdelivery.SLAAlertStatus(strings.TrimSpace(r.URL.Query().Get("status")))
	alerts, err := partnerdelivery.ListDeliverySLAAlerts(s.db, status, limit)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list delivery SLA alerts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alerts": alerts, "total": len(alerts)})
}

func (s *protectedStoreServer) handleAcknowledgeDeliverySLAAlert(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionManage, "operator")
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
	alert, err := partnerdelivery.AcknowledgeDeliverySLAAlert(s.db, partnerdelivery.AcknowledgeDeliverySLAAlertInput{
		AlertID:         alertID,
		ActorID:         actor.ID,
		ExpectedVersion: body.ExpectedVersion,
	})
	if errors.Is(err, partnerdelivery.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "alertId and expectedVersion are required")
		return
	}
	if errors.Is(err, partnerdelivery.ErrVersionConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "delivery SLA alert changed or is no longer open")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to acknowledge delivery SLA alert")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alert": alert})
}
