package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/support"
	"dsh-api/internal/wlt"
)

func marshalIncidentEvent(event support.IncidentEvent) map[string]any {
	return map[string]any{
		"id":            event.ID,
		"incidentId":    event.IncidentID,
		"actorId":       event.ActorID,
		"eventType":     event.EventType,
		"fromStatus":    event.FromStatus,
		"toStatus":      event.ToStatus,
		"correlationId": event.CorrelationID,
		"createdAt":     event.CreatedAt,
	}
}

func (s *protectedStoreServer) handleCreateGovernedIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage)
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
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
	incident, err := support.CreateGovernedIncident(s.db, support.GovernedIncidentCreateInput{
		ActorID:        actor.ID,
		Title:          body.Title,
		Description:    body.Description,
		Severity:       support.IncidentSeverity(body.Severity),
		AffectedScope:  support.IncidentScope(body.AffectedScope),
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to create governed incident")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"incident": marshalIncident(incident)})
}

func (s *protectedStoreServer) handleListGovernedIncidents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead); !ok {
		return
	}
	incidents, err := support.ListGovernedIncidents(s.db, r.URL.Query().Get("status"), 50)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list governed incidents")
		return
	}
	items := make([]map[string]any, 0, len(incidents))
	for _, incident := range incidents {
		items = append(items, marshalIncident(incident))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incidents": items})
}

func (s *protectedStoreServer) handleGetGovernedIncident(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead); !ok {
		return
	}
	incident, err := support.GetGovernedIncident(s.db, r.PathValue("incidentId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to load governed incident")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalIncident(incident)})
}

func (s *protectedStoreServer) handleUpdateGovernedIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage)
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		ExpectedStatus  string `json:"expectedStatus"`
		ExpectedVersion int64  `json:"expectedVersion"`
		Status          string `json:"status"`
		PostmortemURL   string `json:"postmortemUrl"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	incident, err := support.UpdateGovernedIncident(s.db, support.GovernedIncidentTransitionInput{
		ActorID:         actor.ID,
		IncidentID:      r.PathValue("incidentId"),
		ExpectedStatus:  support.IncidentStatus(body.ExpectedStatus),
		ExpectedVersion: body.ExpectedVersion,
		Status:          support.IncidentStatus(body.Status),
		PostmortemURL:   body.PostmortemURL,
		IdempotencyKey:  idempotencyKey,
		CorrelationID:   correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to update governed incident")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalIncident(incident)})
}

func (s *protectedStoreServer) handleListGovernedIncidentEvents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead); !ok {
		return
	}
	incidentID := r.PathValue("incidentId")
	if _, err := support.GetGovernedIncident(s.db, incidentID); err != nil {
		sendGovernedSupportError(w, err, "failed to load governed incident")
		return
	}
	events, err := support.ListIncidentEvents(s.db, incidentID, 200)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list incident events")
		return
	}
	items := make([]map[string]any, 0, len(events))
	for _, event := range events {
		items = append(items, marshalIncidentEvent(event))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": items})
}

// RegisterGovernedIncidentRoutes makes the canonical support-owned incident
// contract visible to the runtime router and static route/contract verification.
func RegisterGovernedIncidentRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/support/incidents", protected.withPermission("control-panel", SupportPermissionRead, protected.handleListGovernedIncidents))
	mux.HandleFunc("POST /dsh/operator/support/incidents", protected.withPermission("control-panel", SupportPermissionManage, protected.handleCreateGovernedIncident))
	mux.HandleFunc("GET /dsh/operator/support/incidents/{incidentId}", protected.withPermission("control-panel", SupportPermissionRead, protected.handleGetGovernedIncident))
	mux.HandleFunc("PATCH /dsh/operator/support/incidents/{incidentId}", protected.withPermission("control-panel", SupportPermissionManage, protected.handleUpdateGovernedIncident))
	mux.HandleFunc("GET /dsh/operator/support/incidents/{incidentId}/events", protected.withPermission("control-panel", SupportPermissionRead, protected.handleListGovernedIncidentEvents))
	mux.HandleFunc("POST /dsh/operator/support/incidents/{incidentId}/tasks", protected.withPermission("control-panel", SupportPermissionManage, protected.handleCreateIncidentTask))
	mux.HandleFunc("PATCH /dsh/operator/support/incident-tasks/{taskId}", protected.withPermission("control-panel", SupportPermissionManage, protected.handleUpdateIncidentTask))
	mux.HandleFunc("POST /dsh/operator/support/incidents/{incidentId}/communications", protected.withPermission("control-panel", SupportPermissionManage, protected.handleCreateIncidentCommunication))
	mux.HandleFunc("POST /dsh/operator/support/incidents/{incidentId}/entities", protected.withPermission("control-panel", SupportPermissionManage, protected.handleCreateIncidentEntity))
}

func (s *protectedStoreServer) handleCreateIncidentTask(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage)
	if !ok {
		return
	}
	var body struct {
		AssigneeID   string `json:"assigneeId"`
		AssigneeRole string `json:"assigneeRole"`
		Description  string `json:"description"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	task, err := support.AddIncidentTask(s.db, r.PathValue("incidentId"), support.CreateIncidentTaskInput{
		AssigneeID:   body.AssigneeID,
		AssigneeRole: body.AssigneeRole,
		Description:  body.Description,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add incident task")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"task": task})
}

func (s *protectedStoreServer) handleUpdateIncidentTask(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage)
	if !ok {
		return
	}
	var body struct {
		Status      string `json:"status"`
		EvidenceURL string `json:"evidenceUrl"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	task, err := support.UpdateIncidentTaskStatus(s.db, r.PathValue("taskId"), support.UpdateIncidentTaskInput{
		Status:      support.IncidentTaskStatus(body.Status),
		EvidenceURL: body.EvidenceURL,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to update incident task")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": task})
}

func (s *protectedStoreServer) handleCreateIncidentCommunication(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage)
	if !ok {
		return
	}
	var body struct {
		Body         string `json:"body"`
		IsPublicSafe bool   `json:"isPublicSafe"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	comm, err := support.AddIncidentCommunication(s.db, r.PathValue("incidentId"), support.CreateIncidentCommunicationInput{
		AuthorID:     actor.ID,
		Body:         body.Body,
		IsPublicSafe: body.IsPublicSafe,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add incident communication")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"communication": comm})
}

func (s *protectedStoreServer) handleCreateIncidentEntity(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage)
	if !ok {
		return
	}
	var body struct {
		EntityType string `json:"entityType"`
		EntityID   string `json:"entityId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	entity, err := support.AddIncidentEntity(s.db, r.PathValue("incidentId"), body.EntityType, body.EntityID)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add incident entity")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"entity": entity})
}
