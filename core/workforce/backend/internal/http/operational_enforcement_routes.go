package http

import (
	"errors"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

type operationalEnforcementServer struct {
	repo *workforce.Repository
	auth *auth.Client
}

// RegisterOperationalEnforcementRoutes adds explicit commands for state changes
// that must never be performed through a generic PATCH. Financial actions are
// recorded durably before the recovery worker calls WLT.
func RegisterOperationalEnforcementRoutes(handler http.Handler, repo *workforce.Repository, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce operational enforcement requires *http.ServeMux")
	}
	s := &operationalEnforcementServer{repo: repo, auth: authClient}
	mux.HandleFunc("POST /workforce/captains/{actorId}/classification/basic", s.operatorOnly("provider:update", s.promoteCaptainToBasic))
	mux.HandleFunc("PATCH /workforce/provider-incidents/{incidentId}/status", s.operatorOnly("provider:update", s.transitionProviderIncident))
	mux.HandleFunc("GET /workforce/provider-incidents/{incidentId}/transitions", s.operatorOnly("provider:read", s.listProviderIncidentTransitions))
	mux.HandleFunc("GET /workforce/provider-penalty-commands/{commandId}", s.operatorOnly("provider:read", s.getProviderPenaltyCommand))
}

func (s *operationalEnforcementServer) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		identity, err := s.auth.Resolve(r.Context(), r.Header.Get("Authorization"))
		if err != nil {
			if errors.Is(err, auth.ErrIdentityUnavailable) {
				sendError(w, http.StatusServiceUnavailable, "IDENTITY_UNAVAILABLE", "identity service is unavailable")
				return
			}
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "session is invalid or expired")
			return
		}
		boundContext, bindErr := auth.BindIdentityContext(r.Context(), identity)
		if bindErr != nil {
			sendError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "identity operator context is missing")
			return
		}
		r = r.WithContext(boundContext)
		if !identity.HasPermission("workforce", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
			return
		}
		next(w, r, identity)
	}
}

func (s *operationalEnforcementServer) promoteCaptainToBasic(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.PromoteCaptainInput
	if !decodeJSON(w, r, &input) {
		return
	}
	actorID := r.PathValue("actorId")
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	core, err := s.repo.PromoteCaptainToBasic(r.Context(), actorID, identity.Subject, firstRole(identity), correlationID, idempotencyKey, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"operationalCore": core})
}

func (s *operationalEnforcementServer) transitionProviderIncident(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.TransitionProviderIncidentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	incidentID := strings.TrimSpace(r.PathValue("incidentId"))
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))

	switch strings.TrimSpace(input.ToStatus) {
	case "financial_action_posted", "reversed":
		command, replayed, err := s.repo.RecordProviderPenaltyCommand(r.Context(), incidentID,
			identity.Subject, firstRole(identity), idempotencyKey, correlationID, input)
		if err != nil {
			writeWorkforceError(w, err)
			return
		}
		sendJSON(w, http.StatusAccepted, map[string]any{"financialCommand": command, "replayed": replayed})
		return
	}

	incident, err := s.repo.TransitionProviderIncident(r.Context(), incidentID, identity.Subject, firstRole(identity), correlationID, idempotencyKey, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"incident": incident})
}

func (s *operationalEnforcementServer) getProviderPenaltyCommand(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	command, err := s.repo.ProviderPenaltyCommandByID(r.Context(), strings.TrimSpace(r.PathValue("commandId")))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"financialCommand": command})
}

func (s *operationalEnforcementServer) listProviderIncidentTransitions(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	transitions, err := s.repo.ListProviderIncidentTransitions(r.Context(), strings.TrimSpace(r.PathValue("incidentId")))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"transitions": transitions})
}
