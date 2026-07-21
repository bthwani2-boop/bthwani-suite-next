package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

func (s *protectedStoreServer) handleListClientSupportTickets(w http.ResponseWriter, r *http.Request) {
	s.handleListMyTickets(w, r)
}

func (s *protectedStoreServer) handleGetClientSupportTicket(w http.ResponseWriter, r *http.Request) {
	s.handleGetTicket(w, r)
}

func (s *protectedStoreServer) handleAddClientSupportMessage(w http.ResponseWriter, r *http.Request) {
	s.handleAddTicketMessage(w, r)
}

func (s *protectedStoreServer) handleListOperatorSupportTickets(w http.ResponseWriter, r *http.Request) {
	s.handleOperatorListTickets(w, r)
}

func (s *protectedStoreServer) handleGetOperatorSupportTicket(w http.ResponseWriter, r *http.Request) {
	s.handleGetTicket(w, r)
}

func (s *protectedStoreServer) handleUpdateOperatorSupportTicket(w http.ResponseWriter, r *http.Request) {
	s.handleOperatorUpdateTicket(w, r)
}

func (s *protectedStoreServer) handleAddOperatorSupportMessage(w http.ResponseWriter, r *http.Request) {
	s.handleAddTicketMessage(w, r)
}

func (s *protectedStoreServer) handleEscalateSupportTicket(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	ticket, err := support.UpdateTicket(s.db, r.PathValue("ticketId"), support.UpdateTicketInput{
		Status:     support.StatusInReview,
		AssignedTo: actor.ID,
	})
	if errors.Is(err, support.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "ticket not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to escalate ticket")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"ticket": marshalTicket(ticket)})
}
