package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// RegisterLegacyContractCompatibilityRoutes keeps bounded method/path
// compatibility without reopening retired direct administration mutations.
func RegisterLegacyContractCompatibilityRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)

	// Safe aliases: identical protected handlers and ownership checks.
	mux.HandleFunc("PUT /dsh/stores/{storeId}/images/{role}", protected.handlePutStoreImageSafe)
	mux.HandleFunc("PUT /dsh/partner/catalog/product-proposals/{proposalId}", protected.handleUpdatePartnerProductProposalAtomic)
	mux.HandleFunc("PUT /dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}", protected.handleUpdateFieldProductProposalAtomic)

	// JRN-038 partner finance compatibility remains actor- and tenant-bound.
	// The handlers verify partner ownership before forwarding to WLT, which
	// remains the sole owner of COD financial truth.
	mux.HandleFunc("GET /dsh/partner/me/finance/cod-records", protected.handlePartnerFinanceCodRecords)
	mux.HandleFunc("POST /dsh/partner/me/finance/cod-records/{recordId}/remit", protected.handlePartnerRemitCod)

	// Retired direct mutations: callers must use actor-scoped or maker-checker
	// routes. These remain explicit only to fail closed for stale clients.
	mux.HandleFunc("POST /dsh/operator/workforce/media/uploads", retiredGovernedRoute)
	mux.HandleFunc("POST /dsh/operator/admin/roles", retiredGovernedRoute)
	mux.HandleFunc("POST /dsh/operator/admin/partners/{partnerId}/activate", retiredGovernedRoute)
	mux.HandleFunc("POST /dsh/operator/admin/partners/{partnerId}/block", retiredGovernedRoute)
	mux.HandleFunc("POST /dsh/operator/admin/captains/{captainId}/credential", retiredGovernedRoute)
}

func retiredGovernedRoute(w http.ResponseWriter, _ *http.Request) {
	store.SendError(
		w,
		http.StatusGone,
		"ROUTE_RETIRED",
		"direct mutation route retired; use the governed actor-scoped or maker-checker workflow",
	)
}
