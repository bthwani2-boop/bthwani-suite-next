package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterPartnerSelfRoutes closes the authenticated partner self-service
// boundary explicitly. Every handler authenticates the partner actor and
// resolves the governed store before returning partner-owned operational truth.
// The order workboard remains registered by NewRouter because it is also part
// of the shared order-fulfillment route group; registering it here as well
// causes net/http ServeMux to panic during application bootstrap.
func RegisterPartnerSelfRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/partner/activation/status", protected.handlePartnerActivationStatus)
	mux.HandleFunc("GET /dsh/partner/activation/readiness", protected.handlePartnerActivationReadiness)
	mux.HandleFunc("GET /dsh/partner/analytics/performance", protected.handlePartnerPerformance)
}
