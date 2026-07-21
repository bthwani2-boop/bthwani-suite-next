package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterPlatformPolicyRoutes binds the DSH-owned operational platform
// policies to the same protected server boundary used by the rest of DSH.
// Platform Control remains the owner of runtime variables, flags, change sets,
// and rollouts; DSH owns service zones, SLA, capacity, serviceability, and the
// onboarding-fee policy definition.
func RegisterPlatformPolicyRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	// protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	// The following routes are now registered via registerUnifiedCatalogRoutes in catalog_unified_routes.go
	// mux.HandleFunc("GET /dsh/operator/platform/zones", protected.handleListZones)
	// mux.HandleFunc("POST /dsh/operator/platform/zones", protected.handleCreateZone)
	// mux.HandleFunc("PATCH /dsh/operator/platform/zones/{zoneId}", protected.handleUpdateZone)
	// mux.HandleFunc("GET /dsh/operator/platform/sla-rules", protected.handleListSlaRules)
	// mux.HandleFunc("PUT /dsh/operator/platform/sla-rules", protected.handleUpsertSlaRules)
	// mux.HandleFunc("GET /dsh/operator/platform/capacity", protected.handleGetCapacityConfig)
	// mux.HandleFunc("PUT /dsh/operator/platform/capacity", protected.handleUpsertCapacityConfig)
	// mux.HandleFunc("GET /dsh/operator/platform/serviceability/{zoneId}", protected.handleGetZoneServiceability)
	// mux.HandleFunc("GET /dsh/operator/platform/store-onboarding-fee", protected.handleGetStoreOnboardingFeePolicy)
	// mux.HandleFunc("PUT /dsh/operator/platform/store-onboarding-fee", protected.handleUpsertStoreOnboardingFeePolicy)
	// mux.HandleFunc("GET /dsh/platform/store-onboarding-fee", protected.handleGetStoreOnboardingFeeReference)
}
