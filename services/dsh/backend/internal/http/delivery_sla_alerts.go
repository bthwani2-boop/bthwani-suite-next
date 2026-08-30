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

func marshalDeliverySLAAlert(alert partnerdelivery.DeliverySLAAlert) map[string]any {
	return map[string]any{
		"id":                    alert.ID,
		"operatorContextId":     alert.OperatorContextID,
		"taskId":                alert.TaskID,
		"orderId":               alert.OrderID,
		"storeId":               alert.StoreID,
		"leg":                   alert.Leg,
		"status":                alert.Status,
		"detectedAt":            alert.DetectedAt,
		"acknowledgedByActorId": alert.AcknowledgedByActorID,
		"acknowledgedAt":        alert.AcknowledgedAt,
		"resolvedAt":            alert.ResolvedAt,
		"correlationId":         alert.CorrelationID,
		"version":               alert.Version,
		"createdAt":             alert.CreatedAt,
		"updatedAt":             alert.UpdatedAt,
	}
}

func (s *protectedStoreServer) handleRefreshDeliverySLAAlerts(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	correlationID := operationalCorrelationID(r, "")
	result, err := partnerdelivery.RefreshDeliverySLAAlerts(s.db, actor.OperatorContextID, correlationID, time.Now().UTC())
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
	actor, ok := s.ActorFromContext(r.Context())
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
	alerts, err := partnerdelivery.ListDeliverySLAAlerts(s.db, actor.OperatorContextID, status, limit)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list delivery SLA alerts")
		return
	}
	items := make([]map[string]any, 0, len(alerts))
	for i := range alerts {
		items = append(items, marshalDeliverySLAAlert(alerts[i]))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"alerts": items, "total": len(items)})
}

func (s *protectedStoreServer) handleAcknowledgeDeliverySLAAlert(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
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
		OperatorContextID: actor.OperatorContextID,
		AlertID:           alertID,
		ActorID:           actor.ID,
		ExpectedVersion:   body.ExpectedVersion,
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
	store.SendJSON(w, http.StatusOK, map[string]any{"alert": marshalDeliverySLAAlert(*alert)})
}
