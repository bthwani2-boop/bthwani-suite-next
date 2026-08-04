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
// provider readback, client-address privacy, onboarding fees, and dispatch
// balance requirements. WLT remains the balance and ledger owner.
func RegisterPlatformPolicyRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/platform/map-provider-health", protected.withPermission("control-panel", "platform.read", protected.handleOperatorMapProviderHealth))
	mux.HandleFunc("GET /dsh/operator/platform/service-areas/{serviceAreaCode}", protected.withPermission("control-panel", "platform.read", protected.handleOperatorGetServiceArea))
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/policy", protected.withPermission("control-panel", "platform.read", protected.handleGetClientAddressPrivacyPolicy))
	mux.HandleFunc("PUT /dsh/operator/privacy/client-addresses/policy", protected.withPermission("control-panel", "platform.manage", protected.handleUpdateClientAddressPrivacyPolicy))
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/status", protected.withPermission("control-panel", "platform.read", protected.handleGetClientAddressPrivacyStatus))
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/events", protected.withPermission("control-panel", "platform.read", protected.handleListClientAddressPrivacyEvents))
	mux.HandleFunc("POST /dsh/operator/privacy/client-addresses/anonymize", protected.withPermission("control-panel", "platform.manage", protected.handleAnonymizeExpiredClientAddresses))

	// Captain financial eligibility. Refresh performs a OperatorContext-scoped WLT wallet
	// read and stores only a short-lived DSH dispatch decision snapshot.
	mux.HandleFunc("GET /dsh/operator/platform/dispatch-balance-policy", protected.withPermission("control-panel", DshDispatchCapacityPermissionRead, protected.handleGetDispatchBalancePolicy))
	mux.HandleFunc("PUT /dsh/operator/platform/dispatch-balance-policy", protected.withPermission("control-panel", DshDispatchCapacityPermissionManage, protected.handleUpsertDispatchBalancePolicy))
	mux.HandleFunc("GET /dsh/operator/dispatch/captains/{captainId}/financial-eligibility", protected.withPermission("control-panel", DshDispatchFinancialEligibilityPermissionRead, protected.handleGetOperatorCaptainFinancialEligibility))
	mux.HandleFunc("POST /dsh/operator/dispatch/captains/{captainId}/financial-eligibility/refresh", protected.withPermission("control-panel", DshDispatchFinancialEligibilityPermissionManage, protected.handleRefreshOperatorCaptainFinancialEligibility))
	mux.HandleFunc("GET /dsh/captain/dispatch/financial-eligibility", protected.handleGetOwnCaptainFinancialEligibility)
	mux.HandleFunc("POST /dsh/captain/dispatch/financial-eligibility/refresh", protected.handleRefreshOwnCaptainFinancialEligibility)

	// Unified operational policy routes. Existing zone/SLA/capacity
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
	// mux.HandleFunc("GET /dsh/operator/platform/zones", protected.withPermission("control-panel", DshServiceZonesPermissionRead, protected.handleListZones))
	// mux.HandleFunc("POST /dsh/operator/platform/zones", protected.withPermission("control-panel", DshServiceZonesPermissionManage, protected.handleCreateZone))
	// mux.HandleFunc("PATCH /dsh/operator/platform/zones/{zoneId}", protected.withPermission("control-panel", DshServiceZonesPermissionManage, protected.handleUpdateZone))
	// mux.HandleFunc("GET /dsh/operator/platform/sla-rules", protected.withPermission("control-panel", DshFulfillmentSlaPermissionRead, protected.handleListSlaRules))
	// mux.HandleFunc("PUT /dsh/operator/platform/sla-rules", protected.withPermission("control-panel", DshFulfillmentSlaPermissionManage, protected.handleUpsertSlaRules))
	// mux.HandleFunc("GET /dsh/operator/platform/capacity", protected.withPermission("control-panel", DshDispatchCapacityPermissionRead, protected.handleGetCapacityConfig))
	// mux.HandleFunc("PUT /dsh/operator/platform/capacity", protected.withPermission("control-panel", DshDispatchCapacityPermissionManage, protected.handleUpsertCapacityConfig))
	// mux.HandleFunc("GET /dsh/operator/platform/serviceability/{zoneId}", protected.withPermission("control-panel", DshServiceZonesPermissionRead, protected.handleGetZoneServiceability))
	// mux.HandleFunc("GET /dsh/operator/platform/store-onboarding-fee", protected.withPermission("control-panel", "partners.read", protected.handleGetStoreOnboardingFeePolicy))
	// mux.HandleFunc("PUT /dsh/operator/platform/store-onboarding-fee", protected.withPermission("control-panel", "partners.manage", protected.handleUpsertStoreOnboardingFeePolicy))
	// mux.HandleFunc("GET /dsh/platform/store-onboarding-fee", protected.handleGetStoreOnboardingFeeReference)
}