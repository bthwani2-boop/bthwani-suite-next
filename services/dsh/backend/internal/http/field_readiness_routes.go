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
// Governed handlers remain the sole authorization and persistence boundary for
// every state-changing operation in JRN-024.
func RegisterFieldReadinessRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)

	mux.HandleFunc("POST /dsh/field/stores/{storeId}/visits", protected.handleCreateGovernedFieldVisit)
	mux.HandleFunc("GET /dsh/field/stores/{storeId}/visits", protected.handleListFieldVisits)
	mux.HandleFunc("GET /dsh/field/work-queue", protected.handleFieldWorkQueue)
	mux.HandleFunc("POST /dsh/field/visits/{visitId}/complete", protected.handleCompleteGovernedFieldVisit)
	mux.HandleFunc("PUT /dsh/field/visits/{visitId}/checks", protected.handleUpsertGovernedReadinessCheck)
	mux.HandleFunc("GET /dsh/field/visits/{visitId}/checks", protected.handleListVisitChecks)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/escalations", protected.handleCreateGovernedReadinessEscalation)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/media/uploads", protected.handleFieldReadinessMediaUpload)
	mux.HandleFunc("GET /dsh/operator/field-readiness/escalations", protected.handleListOperatorEscalations)
	mux.HandleFunc("PATCH /dsh/operator/field-readiness/escalations/{escalationId}", protected.handleUpdateGovernedEscalation)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/onboarding-status", protected.handleGovernedPartnerOnboardingStatus)
}
