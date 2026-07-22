package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterGovernedIncidentRoutes makes the JRN-021 incident surface explicit
// in the runtime router and in static route extraction.
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
