package http

import (
	"net/http"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

// handleGetReadiness handles the GET /workforce/readiness/{actorId} request to evaluate a unified gate.
func (s *server) handleGetReadiness(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := r.PathValue("actorId")
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "BAD_REQUEST", "missing actorId")
		return
	}

	// Prevent IDOR: users can only check their own readiness, unless they have provider:read:all
	if actorID != identity.Subject && !identity.HasPermission("workforce", "provider:read", "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "cannot read readiness of another actor")
		return
	}

	gate, err := s.service.EvaluateReadiness(r.Context(), actorID)
	if err != nil {
		if err == workforce.ErrNotFound {
			sendError(w, http.StatusNotFound, "NOT_FOUND", "actor not found in workforce")
			return
		}
		sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "error evaluating readiness")
		return
	}

	sendJSON(w, http.StatusOK, gate)
}
