package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

const errTicketNotFound = "ticket not found"

// POST /dsh/support/tickets
func (s *protectedStoreServer) handleCreateSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	var body struct {
		StoreID     string `json:"storeId"`
		Subject     string `json:"subject"`
		Description string `json:"description"`
		Category    string `json:"category"`
		Priority    string `json:"priority"`
		OrderID     string `json:"orderId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	ticket, err := support.CreateTicket(s.db, support.CreateTicketInput{
		StoreID:      body.StoreID,
		ReporterID:   actor.ID,
		ReporterRole: support.ReporterRole(actor.Role),
		Subject:      body.Subject,
		Description:  body.Description,
		Category:     support.TicketCategory(body.Category),
		Priority:     support.TicketPriority(body.Priority),
		OrderID:      body.OrderID,
	})
	if errors.Is(err, support.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "subject and description are required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create ticket")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/support/tickets
func (s *protectedStoreServer) handleListMyTickets(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	tickets, err := support.ListReporterTickets(s.db, actor.ID, 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list tickets")
		return
	}
	result := make([]map[string]any, 0, len(tickets))
	for _, t := range tickets {
		result = append(result, marshalTicket(t))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickets": result})
}

// GET /dsh/support/tickets/{ticketId}
func (s *protectedStoreServer) handleGetTicket(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	ticketID := r.PathValue("ticketId")
	ticket, err := support.GetTicket(s.db, ticketID)
	if errors.Is(err, support.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", errTicketNotFound)
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// POST /dsh/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleAddTicketMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	ticketID := r.PathValue("ticketId")
	var body struct {
		Body       string `json:"body"`
		IsInternal bool   `json:"isInternal"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	msg, err := support.AddMessage(s.db, ticketID, support.AddMessageInput{
		SenderID:   actor.ID,
		SenderRole: actor.Role,
		Body:       body.Body,
		IsInternal: body.IsInternal && actor.Role == "operator",
	})
	if errors.Is(err, support.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "message body is required")
		return
	}
	if errors.Is(err, support.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", errTicketNotFound)
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to add message")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": marshalMessage(msg)})
}

// GET /dsh/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleListTicketMessages(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	ticketID := r.PathValue("ticketId")
	includeInternal := actor.Role == "operator"
	messages, err := support.ListTicketMessages(s.db, ticketID, includeInternal)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list messages")
		return
	}
	result := make([]map[string]any, 0, len(messages))
	for _, m := range messages {
		result = append(result, marshalMessage(m))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"messages": result})
}

// GET /dsh/operator/support/tickets
func (s *protectedStoreServer) handleOperatorListTickets(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	statusFilter := r.URL.Query().Get("status")
	tickets, err := support.ListOperatorTickets(s.db, statusFilter, 100)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list tickets")
		return
	}
	result := make([]map[string]any, 0, len(tickets))
	for _, t := range tickets {
		result = append(result, marshalTicket(t))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickets": result})
}

// PATCH /dsh/operator/support/tickets/{ticketId}
func (s *protectedStoreServer) handleOperatorUpdateTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
	if !ok {
		return
	}
	ticketID := r.PathValue("ticketId")
	var body struct {
		Status     string `json:"status"`
		AssignedTo string `json:"assignedTo"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	assignee := body.AssignedTo
	if assignee == "" {
		assignee = actor.ID
	}
	ticket, err := support.UpdateTicket(s.db, ticketID, support.UpdateTicketInput{
		Status:     support.TicketStatus(body.Status),
		AssignedTo: assignee,
	})
	if errors.Is(err, support.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", errTicketNotFound)
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// POST /dsh/operator/incidents
func (s *protectedStoreServer) handleCreateIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "operator")
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
	_, ok := s.requireActor(w, r, "operator")
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
	actor, ok := s.requireActor(w, r, "operator")
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
