package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterPartnerLifecycleRoutes binds the complete governed partner lifecycle
// shared by control-panel and app-field. The handlers remain the single source
// of authorization and persistence truth; surfaces only consume these routes.
func RegisterPartnerLifecycleRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)

	// Control-panel: partner intake, review, activation, documents, stores,
	// field evidence and immutable audit history.
	mux.HandleFunc("GET /dsh/operator/partners", protected.handleListPartners)
	mux.HandleFunc("POST /dsh/operator/partners", protected.handleCreatePartner)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}", protected.handleGovernedGetPartner)
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/transition", protected.handleGovernedActivationTransition)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/readiness", protected.handleGetPartnerReadiness)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/documents", protected.handleListPartnerDocuments)
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/documents", protected.handleAddPartnerDocument)
	mux.HandleFunc("PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review", protected.handleReviewPartnerDocument)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/stores", protected.handleListPartnerStores)
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/stores", protected.handleGovernedLinkPartnerStore)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/field-visits", protected.handleListPartnerFieldVisits)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/audit", protected.handleListPartnerAudit)

	// App-field: owned drafts, store profile, documents, visits, readiness and
	// submission. Every handler verifies the field actor and draft ownership.
	mux.HandleFunc("GET /dsh/field/partners", protected.handleFieldListPartnerDrafts)
	mux.HandleFunc("POST /dsh/field/partners/drafts", protected.handleFieldCreatePartnerDraft)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}", protected.handleGovernedFieldGetPartnerDraft)
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}", protected.handleGovernedFieldUpdatePartnerDraft)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/readiness", protected.handleFieldGetPartnerReadiness)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/store", protected.handleFieldGetPartnerStore)
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/store", protected.handleFieldUpdatePartnerStore)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/documents", protected.handleFieldListPartnerDocuments)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/documents", protected.handleFieldUploadPartnerDocument)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/visits", protected.handleGovernedFieldCreatePartnerVisit)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/field-visits", protected.handleFieldListPartnerFieldVisits)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/submit", protected.handleGovernedFieldSubmitPartnerDraft)
}
