package http

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/wltclient"
	"workforce-api/internal/workforce"
)

type operationalEnforcementServer struct {
	repo *workforce.Repository
	auth *auth.Client
	wlt  *wltclient.Client
}

// RegisterOperationalEnforcementRoutes adds explicit commands for state changes
// that must never be performed through a generic PATCH. Financial actions are
// posted and reversed by WLT before Workforce records the operational status.
func RegisterOperationalEnforcementRoutes(handler http.Handler, repo *workforce.Repository, authClient *auth.Client, wlt *wltclient.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce operational enforcement requires *http.ServeMux")
	}
	s := &operationalEnforcementServer{repo: repo, auth: authClient, wlt: wlt}
	mux.HandleFunc("POST /workforce/captains/{actorId}/classification/basic", s.operatorOnly("provider:update", s.promoteCaptainToBasic))
	mux.HandleFunc("PATCH /workforce/provider-incidents/{incidentId}/status", s.operatorOnly("provider:update", s.transitionProviderIncident))
	mux.HandleFunc("GET /workforce/provider-incidents/{incidentId}/transitions", s.operatorOnly("provider:read", s.listProviderIncidentTransitions))
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

func (s *operationalEnforcementServer) transitionProviderIncident(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.TransitionProviderIncidentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	incidentID := strings.TrimSpace(r.PathValue("incidentId"))
	before, err := s.repo.ProviderIncidentByID(r.Context(), incidentID, "")
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))

	switch strings.TrimSpace(input.ToStatus) {
	case "financial_action_posted":
		if before.ProposedPenaltyMinorUnits <= 0 || strings.TrimSpace(before.PolicyID) == "" {
			writeWorkforceError(w, fmt.Errorf("%w: approved penalty amount and policy are required", workforce.ErrInvalidInput))
			return
		}
		person, err := s.repo.PersonByActorID(r.Context(), before.ActorID)
		if err != nil {
			writeWorkforceError(w, err)
			return
		}
		penalty, err := s.wlt.PostPenalty(r.Context(), "provider-incident:"+incidentID, correlationID, wltclient.PostPenaltyInput{
			IncidentID:        incidentID,
			ProviderActorID:   before.ActorID,
			ProviderActorType: person.WorkforceKind,
			AmountMinorUnits:  before.ProposedPenaltyMinorUnits,
			Currency:          before.Currency,
			Reason:            strings.TrimSpace(input.ResolutionNote),
			PostedByActorID:   identity.Subject,
		})
		if err != nil {
			sendError(w, http.StatusConflict, "WLT_PROVIDER_PENALTY_FAILED", err.Error())
			return
		}
		// The WLT penalty ID is the stable financial reference. WLT owns the
		// corresponding balanced ledger transaction and its immutable lines.
		input.WltLedgerReference = penalty.ID
	case "reversed":
		if strings.TrimSpace(before.WltLedgerReference) == "" {
			writeWorkforceError(w, fmt.Errorf("%w: WLT penalty reference is required for reversal", workforce.ErrInvalidInput))
			return
		}
		if _, err := s.wlt.ReversePenalty(r.Context(), before.WltLedgerReference, correlationID, wltclient.ReversePenaltyInput{
			Reason:            strings.TrimSpace(input.ResolutionNote),
			ReversedByActorID: identity.Subject,
		}); err != nil {
			sendError(w, http.StatusConflict, "WLT_PROVIDER_PENALTY_REVERSAL_FAILED", err.Error())
			return
		}
		input.WltLedgerReference = before.WltLedgerReference
	default:
		// Browser-supplied financial references are never accepted. Only the two
		// WLT calls above may populate the internal transition proof.
		input.WltLedgerReference = ""
	}

	incident, err := s.repo.TransitionProviderIncident(r.Context(), incidentID, identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), incident.ActorID,
		"provider.incident.transitioned", before, incident, strings.TrimSpace(input.ResolutionNote), correlationID)
	sendJSON(w, http.StatusOK, map[string]any{"incident": incident})
}

func (s *operationalEnforcementServer) listProviderIncidentTransitions(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	transitions, err := s.repo.ListProviderIncidentTransitions(r.Context(), strings.TrimSpace(r.PathValue("incidentId")))
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"transitions": transitions})
}
