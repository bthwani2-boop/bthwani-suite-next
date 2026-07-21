package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

// requireSupportTicketAccess prevents cross-actor ticket disclosure. Operators
// retain governed support access, while client, partner, and captain actors can
// only read or write tickets they reported. A non-owner receives NOT_FOUND so
// the API does not disclose whether another actor's ticket exists.
func (s *protectedStoreServer) requireSupportTicketAccess(
	w http.ResponseWriter,
	actor store.StoreActor,
	ticketID string,
) (support.Ticket, bool) {
	ticket, err := support.GetTicket(s.db, ticketID)
	if errors.Is(err, support.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", errTicketNotFound)
		return support.Ticket{}, false
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize ticket access")
		return support.Ticket{}, false
	}
	if actor.Role != "operator" && ticket.ReporterID != actor.ID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", errTicketNotFound)
		return support.Ticket{}, false
	}
	return ticket, true
}
