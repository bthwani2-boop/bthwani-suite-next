package http

import (
	"net/http"
	"strings"
)

// providerAffiliationRoute binds a canonical Workforce kind at registration
// time. The HTTP router owns the public collection name; the mutation handler
// receives the already-resolved role instead of re-interpreting a wildcard
// collection from the request path.
func (s *server) providerAffiliationRoute(role string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actorID := strings.TrimSpace(r.PathValue("actorId"))
		if actorID == "" {
			sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "provider actor id is required")
			return
		}
		handleAffiliationReplace(w, r, s.repo, s.auth, role, actorID)
	}
}
