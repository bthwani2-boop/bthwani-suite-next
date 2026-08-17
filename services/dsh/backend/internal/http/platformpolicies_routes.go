package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/media"
	"dsh-api/internal/wlt"
)

// RegisterPlatformPolicyRoutes binds DSH-owned operational policies to the
// same protected server boundary used by the rest of DSH. Platform Control
// remains the owner of runtime variables, flags, change sets, and rollouts;
// WLT remains the sole owner of wallet balances, financial thresholds, and
// dispatch financial policy. DSH owns only the short-lived WLT eligibility
// decision projection used for assignment gating.
func RegisterPlatformPolicyRoutes(
	mux *http.ServeMux,
	db *sql.DB,
	identityClient *auth.Client,
	wltClient *wlt.Client,
	mediaProvider *media.Provider,
) {
	protected := newProtectedStoreServer(db, identityClient, wltClient, nil, mediaProvider)
	mux.HandleFunc("GET /dsh/operator/platform/map-provider-health", protected.withPermission("control-panel", DshPlatformPermissionRead, protected.handleOperatorMapProviderHealth))
	mux.HandleFunc("GET /dsh/operator/platform/service-areas/{serviceAreaCode}", protected.withPermission("control-panel", DshPlatformPermissionRead, protected.handleOperatorGetServiceArea))
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/policy", protected.withPermission("control-panel", DshPlatformPermissionRead, protected.handleGetClientAddressPrivacyPolicy))
	mux.HandleFunc("PUT /dsh/operator/privacy/client-addresses/policy", protected.withPermission("control-panel", DshPlatformPermissionManage, protected.handleUpdateClientAddressPrivacyPolicy))
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/status", protected.withPermission("control-panel", DshPlatformPermissionRead, protected.handleGetClientAddressPrivacyStatus))
	mux.HandleFunc("GET /dsh/operator/privacy/client-addresses/events", protected.withPermission("control-panel", DshPlatformPermissionRead, protected.handleListClientAddressPrivacyEvents))
	mux.HandleFunc("POST /dsh/operator/privacy/client-addresses/anonymize", protected.withPermission("control-panel", DshPlatformPermissionManage, protected.handleAnonymizeExpiredClientAddresses))

	// Captain financial eligibility. Refresh performs an OperatorContext-scoped
	// WLT wallet decision read and stores only a short-lived DSH dispatch snapshot.
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

	// Zone creation and update.
	mux.HandleFunc("POST /dsh/operator/platform/zones", protected.withPermission("control-panel", DshServiceZonesPermissionManage, protected.handleCreateZone))
	mux.HandleFunc("PATCH /dsh/operator/platform/zones/{zoneId}", protected.withPermission("control-panel", DshServiceZonesPermissionManage, protected.handleUpdateZone))

	// GET zones/sla-rules/capacity/serviceability are registered by
	// registerUnifiedCatalogRoutes in catalog_unified_routes.go (single
	// compatibility owner — registering them here too would panic on duplicate
	// mux patterns).
}
