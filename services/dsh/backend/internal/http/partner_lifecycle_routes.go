package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterPartnerLifecycleRoutes binds the complete governed partner lifecycle
// shared by control-panel and app-field. Every route derives tenant ownership
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
	mux.HandleFunc("GET /dsh/operator/partners", protected.withTrustedPartnerTenant(protected.handleTenantListPartners))
	mux.HandleFunc("POST /dsh/operator/partners", protected.withTrustedPartnerTenant(protected.handleTenantCreatePartner))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}", protected.withTenantPartnerResource(protected.handleGovernedGetPartner))
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/transition", protected.withTenantPartnerResource(protected.handleGovernedActivationTransition))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/readiness", protected.withTenantPartnerResource(protected.handleAggregatedPartnerReadiness))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/documents", protected.withTenantPartnerResource(protected.handleListPartnerDocuments))
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/documents", protected.withTenantPartnerResource(protected.handleAddPartnerDocument))
	mux.HandleFunc("PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review", protected.withTenantPartnerResource(protected.handleReviewPartnerDocument))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/stores", protected.withTenantPartnerResource(protected.handleListPartnerStores))
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/stores", protected.withTenantPartnerResource(protected.handleTenantLinkPartnerStore))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/field-visits", protected.withTenantPartnerResource(protected.handleListPartnerFieldVisits))
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/audit", protected.withTenantPartnerResource(protected.handleListPartnerAudit))

	// App-field: owned drafts, store profile, documents, visits, readiness and
	// submission. Tenant ownership is checked before the actor ownership check.
	mux.HandleFunc("GET /dsh/field/partners", protected.withTrustedPartnerTenant(protected.handleTenantFieldListPartnerDrafts))
	mux.HandleFunc("POST /dsh/field/partners/drafts", protected.withTrustedPartnerTenant(protected.handleTenantFieldCreatePartnerDraft))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}", protected.withTenantPartnerResource(protected.handleGovernedFieldGetPartnerDraft))
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}", protected.withTenantPartnerResource(protected.handleGovernedFieldUpdatePartnerDraft))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/readiness", protected.withTenantPartnerResource(protected.handleFieldAggregatedPartnerReadiness))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/store", protected.withTenantPartnerResource(protected.handleFieldGetPartnerStore))
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/store", protected.withTenantPartnerResource(protected.handleFieldUpdatePartnerStore))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/documents", protected.withTenantPartnerResource(protected.handleFieldListPartnerDocuments))
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/documents", protected.withTenantPartnerResource(protected.handleFieldUploadPartnerDocument))
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/visits", protected.withTenantPartnerResource(protected.handleGovernedFieldCreatePartnerVisit))
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/field-visits", protected.withTenantPartnerResource(protected.handleFieldListPartnerFieldVisits))
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/submit", protected.withTenantPartnerResource(protected.handleGovernedFieldSubmitPartnerDraft))
}
