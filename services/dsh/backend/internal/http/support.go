package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

// Support permission actions on the control-panel surface. "operator"
// remains a valid fallback role during RBAC data migration.
const (
	SupportPermissionRead   = "support.read"
	SupportPermissionManage = "support.manage"
)

const errTicketNotFound = "ticket not found"








// POST /dsh/operator/incidents
func (s *protectedStoreServer) handleCreateIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		Title         string `json:"title"`
		Description   string `json:"description"`
		Severity      string `json:"severity"`
		AffectedScope string `json:"affectedScope"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	incident, err := support.CreateIncident(s.db, support.CreateIncidentInput{
		Title:         body.Title,
		Description:   body.Description,
		Severity:      support.IncidentSeverity(body.Severity),
		AffectedScope: support.IncidentScope(body.AffectedScope),
		RaisedBy:      actor.ID,
	})
	if errors.Is(err, support.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "title is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create incident")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"incident": marshalIncident(incident)})
}

// GET /dsh/operator/incidents
func (s *protectedStoreServer) handleListIncidents(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	statusFilter := r.URL.Query().Get("status")
	incidents, err := support.ListIncidents(s.db, statusFilter, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list incidents")
		return
	}
	result := make([]map[string]any, 0, len(incidents))
	for _, i := range incidents {
		result = append(result, marshalIncident(i))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incidents": result})
}

// PATCH /dsh/operator/incidents/{incidentId}
func (s *protectedStoreServer) handleUpdateIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	incidentID := r.PathValue("incidentId")
	var body struct {
		Status        string `json:"status"`
		PostmortemURL string `json:"postmortemUrl"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	incident, err := support.UpdateIncident(s.db, incidentID, support.UpdateIncidentInput{
		Status:        support.IncidentStatus(body.Status),
		ResolvedBy:    actor.ID,
		PostmortemURL: body.PostmortemURL,
	})
	if errors.Is(err, support.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "incident not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update incident")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalIncident(incident)})
}

func marshalTicket(t support.Ticket) map[string]any {
	m := map[string]any{
		"id":           t.ID,
		"storeId":      t.StoreID,
		"reporterId":   t.ReporterID,
		"reporterRole": t.ReporterRole,
		"subject":      t.Subject,
		"description":  t.Description,
		"category":     t.Category,
		"priority":     t.Priority,
		"status":       t.Status,
		"assignedTo":   t.AssignedTo,
		"orderId":      t.OrderID,
		"createdAt":    t.CreatedAt,
		"updatedAt":    t.UpdatedAt,
	}
	if t.ResolvedAt != nil {
		m["resolvedAt"] = t.ResolvedAt
	}
	if t.ClosedAt != nil {
		m["closedAt"] = t.ClosedAt
	}
	return m
}

func marshalMessage(m support.Message) map[string]any {
	return map[string]any{
		"id":         m.ID,
		"ticketId":   m.TicketID,
		"senderId":   m.SenderID,
		"senderRole": m.SenderRole,
		"body":       m.Body,
		"isInternal": m.IsInternal,
		"createdAt":  m.CreatedAt,
	}
}

func marshalIncident(i support.Incident) map[string]any {
	m := map[string]any{
		"id":            i.ID,
		"title":         i.Title,
		"description":   i.Description,
		"severity":      i.Severity,
		"status":        i.Status,
		"affectedScope": i.AffectedScope,
		"raisedBy":      i.RaisedBy,
		"postmortemUrl": i.PostmortemURL,
		"createdAt":     i.CreatedAt,
		"updatedAt":     i.UpdatedAt,
	}
	if i.ResolvedBy != "" {
		m["resolvedBy"] = i.ResolvedBy
	}
	if i.ResolvedAt != nil {
		m["resolvedAt"] = i.ResolvedAt
	}
	return m
}
