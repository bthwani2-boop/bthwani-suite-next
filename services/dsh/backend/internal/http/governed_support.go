package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

func sendGovernedSupportError(w http.ResponseWriter, err error, fallback string) {
	switch {
	case errors.Is(err, support.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", fallback)
	case errors.Is(err, support.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "SUPPORT_SCOPE_DENIED", "support record is outside the actor scope")
	case errors.Is(err, support.ErrConflict):
		store.SendError(w, http.StatusConflict, "SUPPORT_STATE_CONFLICT", "support record changed; reload and retry")
	case errors.Is(err, support.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "support ticket not found")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", fallback)
	}
}

func marshalTicketEvent(event support.TicketEvent) map[string]any {
	return map[string]any{
		"id":            event.ID,
		"ticketId":      event.TicketID,
		"reporterId":    event.ReporterID,
		"actorId":       event.ActorID,
		"actorRole":     event.ActorRole,
		"eventType":     event.EventType,
		"correlationId": event.CorrelationID,
		"createdAt":     event.CreatedAt,
	}
}

// POST /dsh/client/support/tickets
func (s *protectedStoreServer) handleCreateGovernedClientSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		StoreID     string `json:"storeId"`
		OrderID     string `json:"orderId"`
		Subject     string `json:"subject"`
		Description string `json:"description"`
		Category    string `json:"category"`
		Priority    string `json:"priority"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	priority := support.TicketPriority(strings.TrimSpace(body.Priority))
	if priority == "" {
		priority = support.PriorityNormal
	}
	ticket, err := support.CreateClientTicket(s.db, support.ClientCreateTicketInput{
		ActorID:        actor.ID,
		StoreID:        body.StoreID,
		OrderID:        body.OrderID,
		Subject:        body.Subject,
		Description:    body.Description,
		Category:       support.TicketCategory(body.Category),
		Priority:       priority,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to create client support ticket")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/client/support/tickets
func (s *protectedStoreServer) handleListGovernedClientSupportTickets(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	tickets, err := support.ListClientTickets(s.db, actor.ID, 50)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list client support tickets")
		return
	}
	result := make([]map[string]any, 0, len(tickets))
	for _, ticket := range tickets {
		result = append(result, marshalTicket(ticket))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickets": result})
}

// GET /dsh/client/support/tickets/{ticketId}
func (s *protectedStoreServer) handleGetGovernedClientSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	ticket, err := support.GetClientTicket(s.db, actor.ID, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to load client support ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/client/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleListGovernedClientSupportMessages(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	messages, err := support.ListClientMessages(s.db, actor.ID, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list client support messages")
		return
	}
	result := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		result = append(result, marshalMessage(message))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"messages": result})
}

// POST /dsh/client/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleAddGovernedClientSupportMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		Body string `json:"body"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	message, err := support.AddClientMessage(s.db, support.GovernedMessageInput{
		ActorID:        actor.ID,
		TicketID:       r.PathValue("ticketId"),
		Body:           body.Body,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add client support message")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": marshalMessage(message)})
}

// GET /dsh/operator/support/tickets
func (s *protectedStoreServer) handleListGovernedOperatorSupportTickets(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	tickets, err := support.ListOperatorTickets(s.db, r.URL.Query().Get("status"), 100)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list operator support tickets")
		return
	}
	result := make([]map[string]any, 0, len(tickets))
	for _, ticket := range tickets {
		result = append(result, marshalTicket(ticket))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickets": result})
}

// GET /dsh/operator/support/tickets/{ticketId}
func (s *protectedStoreServer) handleGetGovernedOperatorSupportTicket(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	ticket, err := support.GetOperatorTicket(s.db, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to load operator support ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/operator/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleListGovernedOperatorSupportMessages(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	messages, err := support.ListOperatorMessages(s.db, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list operator support messages")
		return
	}
	result := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		result = append(result, marshalMessage(message))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"messages": result})
}

// POST /dsh/operator/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleAddGovernedOperatorSupportMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		Body       string `json:"body"`
		IsInternal bool   `json:"isInternal"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	message, err := support.AddOperatorMessage(s.db, support.GovernedMessageInput{
		ActorID:        actor.ID,
		TicketID:       r.PathValue("ticketId"),
		Body:           body.Body,
		IsInternal:     body.IsInternal,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add operator support message")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": marshalMessage(message)})
}

// PATCH /dsh/operator/support/tickets/{ticketId}
func (s *protectedStoreServer) handleUpdateGovernedOperatorSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		ExpectedStatus string `json:"expectedStatus"`
		Status         string `json:"status"`
		AssignedTo     string `json:"assignedTo"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	ticket, err := support.UpdateOperatorTicketGoverned(s.db, support.OperatorTicketTransitionInput{
		ActorID:        actor.ID,
		TicketID:       r.PathValue("ticketId"),
		ExpectedStatus: support.TicketStatus(body.ExpectedStatus),
		Status:         support.TicketStatus(body.Status),
		AssignedTo:     body.AssignedTo,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to update operator support ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/operator/support/tickets/{ticketId}/events
func (s *protectedStoreServer) handleListGovernedOperatorSupportEvents(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	if _, err := support.GetOperatorTicket(s.db, r.PathValue("ticketId")); err != nil {
		sendGovernedSupportError(w, err, "failed to load operator support ticket")
		return
	}
	events, err := support.ListTicketEvents(s.db, r.PathValue("ticketId"), 200)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list operator support events")
		return
	}
	result := make([]map[string]any, 0, len(events))
	for _, event := range events {
		result = append(result, marshalTicketEvent(event))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": result})
}
