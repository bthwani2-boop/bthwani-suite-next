package http

import (
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

// RegisterOperationalEnforcementRoutes adds explicit commands for the two
// state changes that must never be performed through a generic PATCH:
// captain promotion and provider incident decisions.
func RegisterOperationalEnforcementRoutes(handler http.Handler, repo *workforce.Repository, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce operational enforcement requires *http.ServeMux")
	}
	s := &operationalCoreServer{repo: repo, auth: authClient}
	mux.HandleFunc("POST /workforce/captains/{actorId}/classification/basic", s.operatorOnly("provider:update", s.promoteCaptainToBasic))
	mux.HandleFunc("PATCH /workforce/provider-incidents/{incidentId}/status", s.operatorOnly("provider:update", s.transitionProviderIncident))
	mux.HandleFunc("GET /workforce/provider-incidents/{incidentId}/transitions", s.operatorOnly("provider:read", s.listProviderIncidentTransitions))
}

func (s *operationalCoreServer) promoteCaptainToBasic(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.PromoteCaptainInput
	if !decodeJSON(w, r, &input) {
		return
	}
	before, _ := s.repo.OperationalCoreByActorID(r.Context(), r.PathValue("actorId"))
	core, err := s.repo.PromoteCaptainToBasic(r.Context(), r.PathValue("actorId"), identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), r.PathValue("actorId"),
		"captain.classification.promoted", before, core, strings.TrimSpace(input.DecisionNote), r.Header.Get("X-Correlation-ID"))
	sendJSON(w, http.StatusOK, map[string]any{"operationalCore": core})
}

func (s *operationalCoreServer) transitionProviderIncident(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.TransitionProviderIncidentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	incidentID := strings.TrimSpace(r.PathValue("incidentId"))
	before, _ := s.repo.ProviderIncidentByID(r.Context(), incidentID, "")
	incident, err := s.repo.TransitionProviderIncident(r.Context(), incidentID, identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), incident.ActorID,
		"provider.incident.transitioned", before, incident, strings.TrimSpace(input.ResolutionNote), r.Header.Get("X-Correlation-ID"))
	sendJSON(w, http.StatusOK, map[string]any{"incident": incident})
}

func (s *operationalCoreServer) listProviderIncidentTransitions(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	transitions, err := s.repo.ListProviderIncidentTransitions(r.Context(), strings.TrimSpace(r.PathValue("incidentId")))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"transitions": transitions})
}
