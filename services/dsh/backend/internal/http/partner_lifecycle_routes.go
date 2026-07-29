package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterPartnerLifecycleRoutes binds the complete governed partner lifecycle
// shared by control-panel and app-field. Every route derives OperatorContext ownership
// from the authenticated Identity session before authorization and persistence.
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
	mux.HandleFunc("GET /dsh/operator/partners", protected.withTrustedPartnerOperatorContext(protected.handleOperatorContextListPartners))
	mux.HandleFunc("POST /dsh/operator/partners", protected.withTrustedPartnerOperatorContext(protected.handleOperatorContextCreatePartner))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}", protected.withOperatorContextPartnerResource(protected.handleGovernedGetPartner))
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/transition", protected.withOperatorContextPartnerResource(protected.handleGovernedActivationTransition))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/readiness", protected.withOperatorContextPartnerResource(protected.handleAggregatedPartnerReadiness))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/documents", protected.withOperatorContextPartnerResource(protected.handleListPartnerDocuments))
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/documents", protected.withOperatorContextPartnerResource(protected.handleAddPartnerDocument))
	mux.HandleFunc("PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review", protected.withOperatorContextPartnerResource(protected.handleReviewPartnerDocument))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/stores", protected.withOperatorContextPartnerResource(protected.handleListPartnerStores))
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/stores", protected.withOperatorContextPartnerResource(protected.handleOperatorContextLinkPartnerStore))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/field-visits", protected.withOperatorContextPartnerResource(protected.handleListPartnerFieldVisits))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/audit", protected.withOperatorContextPartnerResource(protected.handleListPartnerAudit))

	// App-field: owned drafts, store profile, documents, visits, readiness and
	// submission. OperatorContext ownership is checked before the actor ownership check.
	mux.HandleFunc("GET /dsh/field/partners", protected.withTrustedPartnerOperatorContext(protected.handleOperatorContextFieldListPartnerDrafts))
	mux.HandleFunc("POST /dsh/field/partners/drafts", protected.withTrustedPartnerOperatorContext(protected.handleOperatorContextFieldCreatePartnerDraft))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}", protected.withOperatorContextPartnerResource(protected.handleGovernedFieldGetPartnerDraft))
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}", protected.withOperatorContextPartnerResource(protected.handleGovernedFieldUpdatePartnerDraft))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/readiness", protected.withOperatorContextPartnerResource(protected.handleFieldAggregatedPartnerReadiness))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/store", protected.withOperatorContextPartnerResource(protected.handleFieldGetPartnerStore))
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/store", protected.withOperatorContextPartnerResource(protected.handleFieldUpdatePartnerStore))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/documents", protected.withOperatorContextPartnerResource(protected.handleFieldListPartnerDocuments))
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/documents", protected.withOperatorContextPartnerResource(protected.handleFieldUploadPartnerDocument))
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/visits", protected.withOperatorContextPartnerResource(protected.handleGovernedFieldCreatePartnerVisit))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/field-visits", protected.withOperatorContextPartnerResource(protected.handleFieldListPartnerFieldVisits))
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/submit", protected.withOperatorContextPartnerResource(protected.handleGovernedFieldSubmitPartnerDraft))
}
