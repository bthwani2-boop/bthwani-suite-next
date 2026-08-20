package http

import (
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

type internalActivationReadiness struct {
	IsActive bool     `json:"isActive"`
	Missing  []string `json:"missing"`
}

// RegisterInternalReadinessRoutes exposes the Workforce-owned activation gate
// to DSH through the existing service-to-service identity boundary. Human
// Identity bearer tokens are intentionally not accepted on these routes.
func RegisterInternalReadinessRoutes(handler http.Handler, repo *workforce.Repository, internalDSHToken string) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce internal readiness routes require *http.ServeMux")
	}
	s := &server{repo: repo, internalDSHToken: strings.TrimSpace(internalDSHToken)}
	mux.HandleFunc("GET /internal/captains/{actorId}/readiness", s.internalOnly(s.handleInternalCaptainReadiness))
	mux.HandleFunc("GET /internal/fields/{actorId}/readiness", s.internalOnly(s.handleInternalFieldReadiness))
}

func (s *server) handleInternalCaptainReadiness(w http.ResponseWriter, r *http.Request) {
	s.handleInternalProviderReadiness(w, r, "captain")
}

func (s *server) handleInternalFieldReadiness(w http.ResponseWriter, r *http.Request) {
	s.handleInternalProviderReadiness(w, r, "field")
}

func (s *server) handleInternalProviderReadiness(w http.ResponseWriter, r *http.Request, expectedKind string) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "BAD_REQUEST", "missing actorId")
		return
	}
	operatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
	if operatorContextID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "trusted operator context is required")
		return
	}
	if s.repo == nil {
		sendError(w, http.StatusServiceUnavailable, "WORKFORCE_UNAVAILABLE", "workforce readiness store is unavailable")
		return
	}
	trustedContext := auth.WithOperatorContext(r.Context(), operatorContextID)

	person, err := s.repo.PersonByActorID(trustedContext, actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	if person.WorkforceKind != expectedKind {
		sendError(w, http.StatusNotFound, "NOT_FOUND", "provider not found for requested workforce kind")
		return
	}

	readiness, err := s.repo.GovernedActivationReadiness(trustedContext, actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{
		"activationReadiness": toInternalActivationReadiness(readiness),
	})
}

func toInternalActivationReadiness(readiness workforce.ActivationReadiness) internalActivationReadiness {
	missing := append([]string(nil), readiness.Missing...)
	if missing == nil {
		missing = []string{}
	}
	return internalActivationReadiness{IsActive: readiness.Ready, Missing: missing}
}
