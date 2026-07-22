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
// and rollouts; DSH owns service zones, SLA, capacity, serviceability, map
// provider readback, client-address privacy, and the onboarding-fee policy.
func RegisterPlatformPolicyRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/platform/map-provider-health", protected.handleOperatorMapProviderHealth)
	mux.HandleFunc("GET /dsh/operator/platform/service-areas/{serviceAreaCode}", protected.handleOperatorGetServiceArea)
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/policy", protected.handleGetClientAddressPrivacyPolicy)
	mux.HandleFunc("PUT /dsh/operator/privacy/client-addresses/policy", protected.handleUpdateClientAddressPrivacyPolicy)
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/status", protected.handleGetClientAddressPrivacyStatus)
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/events", protected.handleListClientAddressPrivacyEvents)
	mux.HandleFunc("POST /dsh/operator/privacy/client-addresses/anonymize", protected.handleAnonymizeExpiredClientAddresses)

	// JRN-029 unified operational policy closure. Existing zone/SLA/capacity
	// compatibility routes remain registered by registerUnifiedCatalogRoutes.
	mux.HandleFunc("GET /dsh/operator/platform/operational-profiles/{zoneId}", protected.handleGetOperationalProfile)
	mux.HandleFunc("PUT /dsh/operator/platform/operational-profiles/{zoneId}", protected.handleUpsertOperationalProfile)
	mux.HandleFunc("GET /dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes", protected.handleListOperationalDeliveryModes)
	mux.HandleFunc("PUT /dsh/operator/platform/operational-profiles/{zoneId}/delivery-modes/{fulfillmentMode}", protected.handleUpsertOperationalDeliveryMode)
	mux.HandleFunc("POST /dsh/platform/operational-policy/evaluate", protected.handleEvaluateOperationalPolicy)
	mux.HandleFunc("GET /dsh/operator/platform/operational-policy/audit", protected.handleListOperationalPolicyAudit)
	mux.HandleFunc("POST /dsh/operator/platform/operational-policy/audit/{eventId}/rollback", protected.handleRollbackOperationalPolicy)

	// The following routes are registered via registerUnifiedCatalogRoutes in
	// catalog_unified_routes.go to preserve one compatibility owner.
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
