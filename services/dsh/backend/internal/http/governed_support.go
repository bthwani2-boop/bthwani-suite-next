package http

import (
	"errors"
	"net/http"


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



// GET /dsh/operator/support/tickets
func (s *protectedStoreServer) handleListGovernedOperatorSupportTickets(w http.ResponseWriter, r *http.Request) {
	_, ok := s.ActorFromContext(r.Context())
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
	_, ok := s.ActorFromContext(r.Context())
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
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	messages, err := support.ListOperatorRichMessages(s.db, actor.ID, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list operator support messages")
		return
	}
	result := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		result = append(result, marshalRichMessage(message))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"messages": result})
}

// POST /dsh/operator/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleAddGovernedOperatorSupportMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	input, ok := decodeRichSupportMessageRequest(w, r, true)
	if !ok {
		return
	}
	input.TicketID = r.PathValue("ticketId")
	input.IdempotencyKey = idempotencyKey
	input.CorrelationID = correlationID
	message, err := support.AddOperatorRichMessage(s.db, actor.ID, input)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add operator support message")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": marshalRichMessage(message)})
}

// PATCH /dsh/operator/support/tickets/{ticketId}
func (s *protectedStoreServer) handleUpdateGovernedOperatorSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
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
	_, ok := s.ActorFromContext(r.Context())
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
