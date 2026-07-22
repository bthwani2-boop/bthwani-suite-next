package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleRefreshPreparationAlerts(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(
		w,
		r,
		"control-panel",
		OperationsPermissionManage,
		"operator",
	)
	if !ok {
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	result, err := orders.RefreshPreparationAlerts(
		s.db,
		actor.ID,
		correlationID,
		time.Now().UTC(),
	)
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid alert refresh request")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to refresh preparation alerts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"result": result})
}

func (s *protectedStoreServer) handleListPreparationAlerts(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(
		w,
		r,
		"control-panel",
		OperationsPermissionRead,
		"operator",
	)
	if !ok {
		return
	}
	limit := 100
	if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed < 1 || parsed > 500 {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "limit must be between 1 and 500")
			return
		}
		limit = parsed
	}
	status := orders.PreparationAlertStatus(strings.TrimSpace(r.URL.Query().Get("status")))
	alerts, err := orders.ListPreparationAlerts(s.db, status, limit)
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid preparation alert status")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list preparation alerts")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"alerts": alerts,
		"total":  len(alerts),
	})
}

func (s *protectedStoreServer) handleAcknowledgePreparationAlert(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(
		w,
		r,
		"control-panel",
		OperationsPermissionManage,
		"operator",
	)
	if !ok {
		return
	}
	alertID := strings.TrimSpace(r.PathValue("alertId"))
	if alertID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "alertId is required")
		return
	}
	var body struct {
		ExpectedVersion int `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	alert, err := orders.AcknowledgePreparationAlert(s.db, orders.AcknowledgePreparationAlertInput{
		AlertID:         alertID,
		ActorID:         actor.ID,
		ExpectedVersion: body.ExpectedVersion,
		CorrelationID:   correlationID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "expectedVersion is required")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "preparation alert changed or is no longer open")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to acknowledge preparation alert")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alert": alert})
}
