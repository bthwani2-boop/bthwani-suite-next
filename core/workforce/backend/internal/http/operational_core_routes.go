package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"workforce-api/internal/auth"
	"workforce-api/internal/workforce"
)

type operationalCoreServer struct {
	repo *workforce.Repository
	auth *auth.Client
}

// RegisterOperationalCoreRoutes extends the existing Workforce mux without
// introducing another service or permission engine.
func RegisterOperationalCoreRoutes(handler http.Handler, repo *workforce.Repository, authClient *auth.Client) {
	mux, ok := handler.(*http.ServeMux)
	if !ok {
		panic("workforce operational core requires *http.ServeMux")
	}
	s := &operationalCoreServer{repo: repo, auth: authClient}
	mux.HandleFunc("GET /workforce/field-agents/{actorId}/operational-core", s.operatorOnly("provider:read", s.getOperatorCore))
	mux.HandleFunc("PATCH /workforce/field-agents/{actorId}/operational-core", s.operatorOnly("provider:update", s.patchOperatorCore))
	mux.HandleFunc("GET /workforce/captains/{actorId}/operational-core", s.operatorOnly("provider:read", s.getOperatorCore))
	mux.HandleFunc("PATCH /workforce/captains/{actorId}/operational-core", s.operatorOnly("provider:update", s.patchOperatorCore))
	mux.HandleFunc("GET /workforce/me/operational-core", s.providerSelf("provider:read", s.getOwnCore))
	mux.HandleFunc("GET /workforce/me/availability-notices", s.providerSelf("provider:read", s.listOwnAvailabilityNotices))
	mux.HandleFunc("POST /workforce/me/availability-notices", s.providerSelf("provider:update", s.createOwnAvailabilityNotice))
	mux.HandleFunc("GET /workforce/me/incidents", s.providerSelf("provider:read", s.listOwnIncidents))
	mux.HandleFunc("POST /workforce/me/incidents/{incidentId}/appeal", s.providerSelf("provider:update", s.appealOwnIncident))
	mux.HandleFunc("POST /workforce/provider-incidents", s.operatorOnly("provider:update", s.createProviderIncident))
	mux.HandleFunc("GET /workforce/provider-incidents", s.operatorOnly("provider:read", s.listProviderIncidents))
}

func (s *operationalCoreServer) withIdentity(next guardedHandler) http.HandlerFunc {
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
		next(w, r, identity)
	}
}

func (s *operationalCoreServer) operatorOnly(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "all") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "workforce permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *operationalCoreServer) providerSelf(action string, next guardedHandler) http.HandlerFunc {
	return s.withIdentity(func(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
		if !identity.HasPermission("workforce", action, "own") {
			sendError(w, http.StatusForbidden, "FORBIDDEN", "own provider permission is required")
			return
		}
		next(w, r, identity)
	})
}

func (s *operationalCoreServer) getOperatorCore(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	core, err := s.repo.OperationalCoreByActorID(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	readiness, err := s.repo.ActivationReadiness(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"operationalCore": core, "activationReadiness": readiness})
}

func (s *operationalCoreServer) patchOperatorCore(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	actorID := strings.TrimSpace(r.PathValue("actorId"))
	var input workforce.OperationalCorePatch
	if !decodeJSON(w, r, &input) {
		return
	}
	before, _ := s.repo.OperationalCoreByActorID(r.Context(), actorID)
	core, err := s.repo.PatchOperationalCore(r.Context(), actorID, identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), actorID,
		"provider.operational_core.updated", before, core, "", r.Header.Get("X-Correlation-ID"))
	readiness, err := s.repo.ActivationReadiness(r.Context(), actorID)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"operationalCore": core, "activationReadiness": readiness})
}

func (s *operationalCoreServer) getOwnCore(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	core, err := s.repo.OperationalCoreByActorID(r.Context(), identity.Subject)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	readiness, err := s.repo.ActivationReadiness(r.Context(), identity.Subject)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"operationalCore": core, "activationReadiness": readiness})
}

func (s *operationalCoreServer) createOwnAvailabilityNotice(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.CreateAvailabilityNoticeInput
	if !decodeJSON(w, r, &input) {
		return
	}
	notice, err := s.repo.CreateAvailabilityNotice(r.Context(), identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), identity.Subject,
		"provider.availability_notice.created", nil, notice, input.Note, r.Header.Get("X-Correlation-ID"))
	sendJSON(w, http.StatusCreated, map[string]any{"availabilityNotice": notice})
}

func (s *operationalCoreServer) listOwnAvailabilityNotices(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	notices, err := s.repo.ListAvailabilityNotices(r.Context(), identity.Subject, limit)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"availabilityNotices": notices})
}

func (s *operationalCoreServer) createProviderIncident(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input workforce.CreateProviderIncidentInput
	if !decodeJSON(w, r, &input) {
		return
	}
	incident, err := s.repo.CreateProviderIncident(r.Context(), identity.Subject, input)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), input.ActorID,
		"provider.incident.reported", nil, incident, input.Description, r.Header.Get("X-Correlation-ID"))
	sendJSON(w, http.StatusCreated, map[string]any{"incident": incident})
}

func (s *operationalCoreServer) listProviderIncidents(w http.ResponseWriter, r *http.Request, _ auth.Identity) {
	actorID := strings.TrimSpace(r.URL.Query().Get("actorId"))
	if actorID == "" {
		sendError(w, http.StatusBadRequest, "INVALID_INPUT", "actorId query parameter is required")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	incidents, err := s.repo.ListProviderIncidents(r.Context(), actorID, limit)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"incidents": incidents})
}

func (s *operationalCoreServer) listOwnIncidents(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	incidents, err := s.repo.ListProviderIncidents(r.Context(), identity.Subject, limit)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	sendJSON(w, http.StatusOK, map[string]any{"incidents": incidents})
}

func (s *operationalCoreServer) appealOwnIncident(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	var input struct { Note string `json:"note"` }
	if !decodeJSON(w, r, &input) {
		return
	}
	incident, err := s.repo.SubmitProviderIncidentAppeal(r.Context(), identity.Subject, r.PathValue("incidentId"), input.Note)
	if err != nil {
		writeWorkforceError(w, err)
		return
	}
	_ = s.repo.RecordAudit(r.Context(), identity.Subject, firstRole(identity), identity.Subject,
		"provider.incident.appealed", nil, incident, input.Note, r.Header.Get("X-Correlation-ID"))
	sendJSON(w, http.StatusOK, map[string]any{"incident": incident})
}

func firstRole(identity auth.Identity) string {
	if len(identity.Roles) == 0 {
		return "unknown"
	}
	return identity.Roles[0]
}

// OperationalCoreGateMiddleware prevents the legacy activation/session path
// from bypassing the progressive operational core. It deliberately does not
// block PATCH /workforce/me, so a provider can still complete allowed fields.
func OperationalCoreGateMiddleware(next http.Handler, repo *workforce.Repository, authClient *auth.Client) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		actorID := ""
		gate := false
		if r.Method == http.MethodPost && (strings.Contains(path, "/workforce/field-agents/") || strings.Contains(path, "/workforce/captains/")) &&
			(strings.HasSuffix(path, "/activation-codes") || strings.HasSuffix(path, "/reactivate")) {
			parts := strings.Split(strings.Trim(path, "/"), "/")
			if len(parts) >= 3 {
				actorID = parts[2]
				gate = true
			}
		}
		if r.Method == http.MethodGet && path == "/workforce/me" {
			identity, err := authClient.Resolve(r.Context(), r.Header.Get("Authorization"))
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			person, err := repo.PersonByActorID(r.Context(), identity.Subject)
			if err == nil && (person.WorkforceKind == "field" || person.WorkforceKind == "captain") {
				actorID = identity.Subject
				gate = true
			}
		}
		if gate {
			readiness, err := repo.ActivationReadiness(r.Context(), actorID)
			if err != nil {
				writeWorkforceError(w, err)
				return
			}
			if !readiness.Ready {
				sendJSON(w, http.StatusConflict, map[string]any{
					"code": "OPERATIONAL_CORE_INCOMPLETE",
					"message": "provider operational requirements are incomplete",
					"activationReadiness": readiness,
				})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
