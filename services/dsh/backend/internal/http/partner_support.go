package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

func partnerSupportMutationHeaders(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key is required")
		return "", "", false
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		correlationID = idempotencyKey
	}
	return idempotencyKey, correlationID, true
}

func sendPartnerSupportError(w http.ResponseWriter, err error, fallback string) {
	switch {
	case errors.Is(err, support.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", fallback)
	case errors.Is(err, support.ErrForbidden):
		store.SendError(w, http.StatusForbidden, "PARTNER_SUPPORT_SCOPE_DENIED", "ticket order or store is outside the partner scope")
	case errors.Is(err, support.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "support ticket not found")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", fallback)
	}
}

// POST /dsh/partner/support/tickets
func (s *protectedStoreServer) handleCreatePartnerSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
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
	ticket, err := support.CreatePartnerTicket(s.db, support.PartnerCreateTicketInput{
		ActorID:        actor.ID,
		StoreID:        body.StoreID,
		OrderID:        body.OrderID,
		Subject:        body.Subject,
		Description:    body.Description,
		Category:       support.TicketCategory(body.Category),
		Priority:       support.TicketPriority(body.Priority),
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendPartnerSupportError(w, err, "failed to create partner support ticket")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/partner/support/tickets
func (s *protectedStoreServer) handleListPartnerSupportTickets(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	tickets, err := support.ListPartnerTickets(s.db, actor.ID, 50)
	if err != nil {
		sendPartnerSupportError(w, err, "failed to list partner support tickets")
		return
	}
	result := make([]map[string]any, 0, len(tickets))
	for _, ticket := range tickets {
		result = append(result, marshalTicket(ticket))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tickets": result})
}

// GET /dsh/partner/support/tickets/{ticketId}
func (s *protectedStoreServer) handleGetPartnerSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	ticket, err := support.GetPartnerTicket(s.db, actor.ID, r.PathValue("ticketId"))
	if err != nil {
		sendPartnerSupportError(w, err, "failed to load partner support ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}

// GET /dsh/partner/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleListPartnerSupportMessages(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	messages, err := support.ListPartnerMessages(s.db, actor.ID, r.PathValue("ticketId"))
	if err != nil {
		sendPartnerSupportError(w, err, "failed to list partner support messages")
		return
	}
	result := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		result = append(result, marshalMessage(message))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"messages": result})
}

// POST /dsh/partner/support/tickets/{ticketId}/messages
func (s *protectedStoreServer) handleAddPartnerSupportMessage(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
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
	message, err := support.AddPartnerMessage(s.db, support.PartnerAddMessageInput{
		ActorID:        actor.ID,
		TicketID:       r.PathValue("ticketId"),
		Body:           body.Body,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendPartnerSupportError(w, err, "failed to add partner support message")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"message": marshalMessage(message)})
}
