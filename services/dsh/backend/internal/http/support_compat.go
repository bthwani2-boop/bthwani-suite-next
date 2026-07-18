package http

import (
	"net/http"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

func actorSupportRole(role string) (support.ReporterRole, bool) {
	value := support.ReporterRole(role)
	switch value {
	case support.RoleClient, support.RolePartner, support.RoleCaptain, support.RoleOperator:
		return value, true
	default:
		return "", false
	}
}

// POST /dsh/support/tickets — compatibility path retained for the primary generated contract.
func (s *protectedStoreServer) handleCreateActorSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot create support tickets")
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
	priority := support.TicketPriority(body.Priority)
	if priority == "" {
		priority = support.PriorityNormal
	}
	ticket, err := support.CreateActorTicket(s.db, support.ActorCreateTicketInput{
		ActorID: actor.ID, ActorRole: role, StoreID: body.StoreID, OrderID: body.OrderID,
		Subject: body.Subject, Description: body.Description,
		Category: support.TicketCategory(body.Category), Priority: priority,
		IdempotencyKey: idempotencyKey, CorrelationID: correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to create support ticket")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/support/tickets
func (s *protectedStoreServer) handleListActorSupportTickets(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot list support tickets")
		return
	}
	tickets, err := support.ListActorTickets(s.db, actor.ID, role, 50)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list support tickets")
		return
	}
	result := make([]map[string]any, 0, len(tickets))
	for _, ticket := range tickets {
		result = append(result, marshalTicket(ticket))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickets": result})
}

// GET /dsh/support/tickets/{ticketId}
func (s *protectedStoreServer) handleGetActorSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot read support tickets")
		return
	}
	ticket, err := support.GetActorTicket(s.db, actor.ID, role, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to load support ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleListActorSupportMessages(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot read support messages")
		return
	}
	messages, err := support.ListActorMessages(s.db, actor.ID, role, r.PathValue("ticketId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list support messages")
		return
	}
	result := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		result = append(result, marshalMessage(message))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"messages": result})
}

// POST /dsh/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleAddActorSupportMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	role, ok := actorSupportRole(actor.Role)
	if !ok {
		store.SendError(w, http.StatusForbidden, "SUPPORT_ROLE_DENIED", "actor role cannot add support messages")
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
	message, err := support.AddActorMessage(s.db, actor.ID, role, support.GovernedMessageInput{
		TicketID: r.PathValue("ticketId"), Body: body.Body,
		IdempotencyKey: idempotencyKey, CorrelationID: correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to add support message")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": marshalMessage(message)})
}
