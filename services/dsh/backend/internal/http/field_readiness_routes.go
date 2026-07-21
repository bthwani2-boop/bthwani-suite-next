package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterFieldReadinessRoutes mounts the unified field-visit and readiness
// journey once for app-field, app-partner, and control-panel consumers.
// Handlers remain the sole authorization and persistence boundary.
func RegisterFieldReadinessRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)

	mux.HandleFunc("POST /dsh/field/stores/{storeId}/visits", protected.handleCreateFieldVisit)
	mux.HandleFunc("GET /dsh/field/stores/{storeId}/visits", protected.handleListFieldVisits)
	mux.HandleFunc("GET /dsh/field/work-queue", protected.handleFieldWorkQueue)
	mux.HandleFunc("POST /dsh/field/visits/{visitId}/complete", protected.handleCompleteFieldVisit)
	mux.HandleFunc("PUT /dsh/field/visits/{visitId}/checks", protected.handleUpsertReadinessCheck)
	mux.HandleFunc("GET /dsh/field/visits/{visitId}/checks", protected.handleListVisitChecks)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/escalations", protected.handleCreateReadinessEscalation)
	mux.HandleFunc("GET /dsh/operator/field-readiness/escalations", protected.handleListOperatorEscalations)
	mux.HandleFunc("PATCH /dsh/operator/field-readiness/escalations/{escalationId}", protected.handleUpdateEscalation)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/onboarding-status", protected.handlePartnerOnboardingStatus)
}
