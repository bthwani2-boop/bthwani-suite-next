package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/store"
)

// POST /dsh/captain/dispatch/assignments/{assignmentId}/contact-proxy
//
// This endpoint orchestrates privacy-aware contact proxying.
// Instead of exposing the raw customer phone number, it validates custody state
// and returns a temporary masked relay token or proxy number, enforcing
// J066 Privacy by Stage directives.
func (s *protectedStoreServer) handleCaptainContactProxy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "captain")
	if !ok {
		return
	}

	assignmentID := r.PathValue("assignmentId")
	
	assignment, err := dispatch.GetCaptainAssignment(s.db, assignmentID, actor.ID)
	if err != nil {
		if errors.Is(err, dispatch.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "dispatch assignment not found")
			return
		}
		writeGovernedDispatchError(w, err)
		return
	}

	// Privacy Check: Contact proxy is only allowed if the captain has picked up the order
	// but hasn't completed or returned it.
	switch assignment.Delivery.Status {
	case dispatch.DeliveryPickedUp, dispatch.DeliveryArrivedCustomer:
		// Captain holds custody. Allow proxy creation.
	default:
		store.SendError(w, http.StatusConflict, "CUSTODY_REQUIRED", "contact proxy requires active custody of the package")
		return
	}

	// In a real implementation, we would query Twilio or a VoIP SIP trunk API here
	// to allocate a temporary proxy number bound to (Customer Phone <-> Captain Phone).
	// For DSH headless execution, we return a simulated proxy session.

	proxySession := map[string]any{
		"proxyNumber": "+966500000000",      // Simulated masked number
		"pinCode":     assignmentID[:4],     // Simple relay PIN
		"expiresIn":   1800,                 // Expires in 30 minutes
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"contactSession": proxySession})
}
