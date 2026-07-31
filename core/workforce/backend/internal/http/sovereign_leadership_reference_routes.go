package http

import (
	"net/http"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

// RegisterSovereignLeadershipReferenceRoutes exposes the Workforce-owned
// organisational reference data together with Identity-owned permission bundle
// descriptors. The browser consumes this endpoint instead of maintaining local
// business registries.
func RegisterSovereignLeadershipReferenceRoutes(handler http.Handler, service *workforce.Service, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("sovereign leadership reference routes require *http.ServeMux")
	}
	s := &sovereignLeadershipServer{service: service, auth: authClient}
	mux.HandleFunc("GET /workforce/sovereign-leadership/reference-data", s.withIdentity(s.referenceData))
}

func (s *sovereignLeadershipServer) referenceData(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	if !identity.HasPermission("workforce", "leadership:read", "all") &&
		!identity.HasPermission("workforce", "leadership:create", "all") {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "sovereign leadership reference access is required")
		return
	}
	data, err := s.service.SovereignLeadershipReferences(r.Context())
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, data)
}
