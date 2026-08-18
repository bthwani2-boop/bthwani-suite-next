package http

import (
	"errors"
	"net/http"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

// handleGetReadiness exposes only the Workforce-owned provider readiness
// decision. Cross-service operational readiness is composed by the owning
// journey (for example DSH captain readiness), never fabricated here.
func (s *server) handleGetReadiness(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := r.PathValue("actorId")
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "BAD_REQUEST", "missing actorId")
		return
	}

	// Prevent IDOR: users can only check their own readiness, unless they have provider:read:all.
	if actorID != identity.Subject && !identity.HasPermission("workforce", "provider:read", "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "cannot read readiness of another actor")
		return
	}

	gate, err := s.service.EvaluateReadiness(r.Context(), actorID)
	if err != nil {
		switch {
		case errors.Is(err, workforce.ErrNotFound):
			sendError(w, http.StatusNotFound, "NOT_FOUND", "actor not found in workforce")
		case errors.Is(err, workforce.ErrReadinessDependencyUnavailable):
			sendError(w, http.StatusServiceUnavailable, "WORKFORCE_READINESS_UNAVAILABLE", "a sovereign readiness dependency could not be verified")
		default:
			sendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "error evaluating readiness")
		}
		return
	}

	sendJSON(w, http.StatusOK, gate)
}
