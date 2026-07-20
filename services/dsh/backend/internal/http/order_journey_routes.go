package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterOrderJourneyRoutes binds cross-surface order read models that need a
// joined operational projection while preserving DSH as the sole order owner.
func RegisterOrderJourneyRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/order-workboard", protected.handleOperatorOrderWorkboard)
	mux.HandleFunc("GET /dsh/partner/orders/{orderId}/partner-delivery", protected.handleGetPartnerDeliveryTask)
	mux.HandleFunc("GET /dsh/partner/orders/{orderId}/pickup", protected.handleGetPartnerPickupSession)
}
