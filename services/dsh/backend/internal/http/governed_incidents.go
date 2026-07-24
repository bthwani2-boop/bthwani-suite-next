package http

import (
	"database/sql"
	"net/http"
	"strings"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/support"
	"dsh-api/internal/wlt"
)

type governedIncidentRouteMatch struct {
	IncidentID string
	Collection bool
	Events     bool
}

func matchGovernedIncidentRoute(path string) (governedIncidentRouteMatch, bool) {
	prefixes := []string{
		"/dsh/operator/incidents",
		"/dsh/operator/support/incidents",
	}
	for _, prefix := range prefixes {
		if path == prefix || path == prefix+"/" {
			return governedIncidentRouteMatch{Collection: true}, true
		}
		if !strings.HasPrefix(path, prefix+"/") {
			continue
		}
		rest := strings.Trim(strings.TrimPrefix(path, prefix+"/"), "/")
		if rest == "" {
			return governedIncidentRouteMatch{Collection: true}, true
		}
		parts := strings.Split(rest, "/")
		if len(parts) == 1 && parts[0] != "" {
			return governedIncidentRouteMatch{IncidentID: parts[0]}, true
		}
		if len(parts) == 2 && parts[0] != "" && parts[1] == "events" {
			return governedIncidentRouteMatch{IncidentID: parts[0], Events: true}, true
		}
	}
	return governedIncidentRouteMatch{}, false
}

func marshalIncidentEvent(event support.IncidentEvent) map[string]any {
	return map[string]any{
		"id":            event.ID,
		"incidentId":    event.IncidentID,
		"actorId":       event.ActorID,
		"eventType":     event.EventType,
		"fromStatus":    event.FromStatus,
		"toStatus":      event.ToStatus,
		"correlationId": event.CorrelationID,
		"createdAt":     event.CreatedAt,
	}
}

func (s *protectedStoreServer) handleCreateGovernedIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		Title         string `json:"title"`
		Description   string `json:"description"`
		Severity      string `json:"severity"`
		AffectedScope string `json:"affectedScope"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	incident, err := support.CreateGovernedIncident(s.db, support.GovernedIncidentCreateInput{
		ActorID:        actor.ID,
		Title:          body.Title,
		Description:    body.Description,
		Severity:       support.IncidentSeverity(body.Severity),
		AffectedScope:  support.IncidentScope(body.AffectedScope),
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to create governed incident")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"incident": marshalIncident(incident)})
}

func (s *protectedStoreServer) handleListGovernedIncidents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator"); !ok {
		return
	}
	incidents, err := support.ListGovernedIncidents(s.db, r.URL.Query().Get("status"), 50)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list governed incidents")
		return
	}
	items := make([]map[string]any, 0, len(incidents))
	for _, incident := range incidents {
		items = append(items, marshalIncident(incident))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incidents": items})
}

func (s *protectedStoreServer) handleGetGovernedIncident(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator"); !ok {
		return
	}
	incident, err := support.GetGovernedIncident(s.db, r.PathValue("incidentId"))
	if err != nil {
		sendGovernedSupportError(w, err, "failed to load governed incident")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalIncident(incident)})
}

func (s *protectedStoreServer) handleUpdateGovernedIncident(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := partnerSupportMutationHeaders(w, r)
	if !ok {
		return
	}
	var body struct {
		ExpectedStatus string `json:"expectedStatus"`
		Status         string `json:"status"`
		PostmortemURL  string `json:"postmortemUrl"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	incident, err := support.UpdateGovernedIncident(s.db, support.GovernedIncidentTransitionInput{
		ActorID:        actor.ID,
		IncidentID:     r.PathValue("incidentId"),
		ExpectedStatus: support.IncidentStatus(body.ExpectedStatus),
		Status:         support.IncidentStatus(body.Status),
		PostmortemURL:  body.PostmortemURL,
		IdempotencyKey: idempotencyKey,
		CorrelationID:  correlationID,
	})
	if err != nil {
		sendGovernedSupportError(w, err, "failed to update governed incident")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"incident": marshalIncident(incident)})
}

func (s *protectedStoreServer) handleListGovernedIncidentEvents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator"); !ok {
		return
	}
	incidentID := r.PathValue("incidentId")
	if _, err := support.GetGovernedIncident(s.db, incidentID); err != nil {
		sendGovernedSupportError(w, err, "failed to load governed incident")
		return
	}
	events, err := support.ListIncidentEvents(s.db, incidentID, 200)
	if err != nil {
		sendGovernedSupportError(w, err, "failed to list incident events")
		return
	}
	items := make([]map[string]any, 0, len(events))
	for _, event := range events {
		items = append(items, marshalIncidentEvent(event))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"events": items})
}

// RegisterGovernedIncidentRoutes makes the canonical support-owned incident
// contract visible to the runtime router and static route/contract verification.
// The legacy /dsh/operator/incidents aliases remain intercepted by the
// middleware below and resolve to these same governed handlers.
func RegisterGovernedIncidentRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/support/incidents", protected.handleListGovernedIncidents)
	mux.HandleFunc("POST /dsh/operator/support/incidents", protected.handleCreateGovernedIncident)
	mux.HandleFunc("GET /dsh/operator/support/incidents/{incidentId}", protected.handleGetGovernedIncident)
	mux.HandleFunc("PATCH /dsh/operator/support/incidents/{incidentId}", protected.handleUpdateGovernedIncident)
	mux.HandleFunc("GET /dsh/operator/support/incidents/{incidentId}/events", protected.handleListGovernedIncidentEvents)
}

// GovernedIncidentMiddleware replaces the legacy incident CRUD at runtime and
// also exposes the canonical support-owned path. Both paths resolve to one
// implementation, one state machine and one audit trail.
func GovernedIncidentMiddleware(
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
	next http.Handler,
) http.Handler {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		match, ok := matchGovernedIncidentRoute(r.URL.Path)
		if !ok {
			next.ServeHTTP(w, r)
			return
		}
		if match.IncidentID != "" {
			r.SetPathValue("incidentId", match.IncidentID)
		}
		switch {
		case match.Collection && r.Method == http.MethodPost:
			protected.handleCreateGovernedIncident(w, r)
		case match.Collection && r.Method == http.MethodGet:
			protected.handleListGovernedIncidents(w, r)
		case match.Events && r.Method == http.MethodGet:
			protected.handleListGovernedIncidentEvents(w, r)
		case match.IncidentID != "" && r.Method == http.MethodGet:
			protected.handleGetGovernedIncident(w, r)
		case match.IncidentID != "" && r.Method == http.MethodPatch:
			protected.handleUpdateGovernedIncident(w, r)
		default:
			store.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "incident operation is not supported")
		}
	})
}
