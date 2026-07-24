package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/incident"
	"dsh-api/internal/store"
)

// IncidentPermissionOverride gates every sovereign-intervention entry point
// (cancel, suspend, raise_exception against a partner-owned task). It is
// deliberately distinct from the ordinary control-panel permissions so an
// operator role can read/monitor without being able to override.
const IncidentPermissionOverride = "incident.override"

type reportIncidentBody struct {
	OrderID            string   `json:"orderId"`
	TargetEntityType   string   `json:"targetEntityType"`
	TargetEntityID     string   `json:"targetEntityId"`
	IncidentType       string   `json:"incidentType"`
	Reason             string   `json:"reason"`
	TicketReference    string   `json:"ticketReference"`
	CorrelationID      string   `json:"correlationId"`
	ExpectedVersion    int      `json:"expectedVersion"`
	EvidenceReferences []string `json:"evidenceReferences"`
	ReasonCode         string   `json:"reasonCode"`
	ReasonNote         string   `json:"reasonNote"`
}

func marshalOperationalIncident(inc *incident.Incident) map[string]any {
	return map[string]any{
		"id":                inc.ID,
		"orderId":           inc.OrderID,
		"targetEntityType":  inc.TargetEntityType,
		"targetEntityId":    inc.TargetEntityID,
		"incidentType":      inc.IncidentType,
		"status":            inc.Status,
		"reason":            inc.Reason,
		"ticketReference":   inc.TicketReference,
		"actorId":           inc.ActorID,
		"actorRole":         inc.ActorRole,
		"beforeState":       inc.BeforeState,
		"afterState":        inc.AfterState,
		"failureReason":     inc.FailureReason,
		"partnerNotified":   inc.PartnerNotified,
		"partnerNotifiedAt": inc.PartnerNotifiedAt,
		"correlationId":     inc.CorrelationID,
		"appliedAt":         inc.AppliedAt,
		"createdAt":         inc.CreatedAt,
		"updatedAt":         inc.UpdatedAt,
	}
}

func writeOperationalIncidentError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, incident.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "operational incident not found")
	case errors.Is(err, incident.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusUnprocessableEntity, "INCIDENT_APPLY_FAILED", err.Error())
	}
}

// handleReportOperationalIncident is the sole HTTP entry point for a
// sovereign platform intervention. It requires IncidentPermissionOverride,
// not the ordinary read/manage control-panel permissions used elsewhere in
// this file, so read/monitor access does not imply override access.
func (s *protectedStoreServer) handleReportOperationalIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", IncidentPermissionOverride, "operator")
	if !ok {
		return
	}
	var body reportIncidentBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	reported, err := incident.NewService(s.db).Report(r.Context(), incident.ReportInput{
		OrderID:            strings.TrimSpace(body.OrderID),
		TenantID:           actor.TenantID,
		TargetEntityType:   incident.TargetEntityType(strings.TrimSpace(body.TargetEntityType)),
		TargetEntityID:     strings.TrimSpace(body.TargetEntityID),
		IncidentType:       incident.IncidentType(strings.TrimSpace(body.IncidentType)),
		Reason:             body.Reason,
		TicketReference:    body.TicketReference,
		ActorID:            actor.ID,
		ActorRole:          actor.Role,
		CorrelationID:      operationalCorrelationID(r, body.CorrelationID),
		ExpectedVersion:    body.ExpectedVersion,
		EvidenceReferences: body.EvidenceReferences,
		ReasonCode:         body.ReasonCode,
		ReasonNote:         body.ReasonNote,
	})
	if err != nil {
		writeOperationalIncidentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalOperationalIncident(reported)})
}

func (s *protectedStoreServer) handleListOperatorIncidents(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionRead, "operator")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	incidents, err := incident.List(s.db, incident.ListFilter{
		OrderID: r.URL.Query().Get("orderId"),
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list operational incidents")
		return
	}
	results := make([]map[string]any, 0, len(incidents))
	for i := range incidents {
		results = append(results, marshalOperationalIncident(&incidents[i]))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incidents": results})
}

func (s *protectedStoreServer) handleGetOperatorIncident(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionRead, "operator")
	if !ok {
		return
	}
	inc, err := incident.Get(s.db, r.PathValue("incidentId"))
	if err != nil {
		writeOperationalIncidentError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalOperationalIncident(inc)})
}
