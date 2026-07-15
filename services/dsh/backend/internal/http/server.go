package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/health"
	"dsh-api/internal/homediscovery"
	"dsh-api/internal/media"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func NewRouter(db *sql.DB, identityClient *auth.Client, wltClient *wlt.Client, mediaProvider *media.Provider) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /dsh/health", health.HandleHealth)
	mux.HandleFunc("GET /dsh/readiness", health.HandleReadiness(db, mediaProvider))
	mux.HandleFunc("GET /dsh/stores", store.HandleListStores(db))
	mux.HandleFunc("GET /dsh/stores/{storeId}", store.HandleGetStore(db))
	mux.HandleFunc("GET /dsh/stores/{storeId}/catalog", handlePublicCatalog(db))
	mux.HandleFunc("GET /dsh/public/media/{assetId}/{variant}", handlePublicMedia(db, mediaProvider))
	mux.HandleFunc("GET /dsh/public/reels", handlePublicReels(db))
	mux.HandleFunc("GET /dsh/home-discovery", homediscovery.HandleHomeDiscovery(db))
	protected := newProtectedStoreServer(db, identityClient, wltClient, mediaProvider)
	mux.HandleFunc("POST /dsh/field/media/uploads", protected.handleFieldMediaUpload)
	mux.HandleFunc("GET /dsh/media", protected.handleMediaDownload)
	mux.HandleFunc("GET /dsh/store-context", protected.handleStoreContext)
	mux.HandleFunc("GET /dsh/operator/stores", protected.handleOperatorStores)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}", protected.handleOperatorStoreDetail)
	mux.HandleFunc("GET /dsh/operator/diagnostics/stores/{storeId}", protected.handleOperatorStoreDiagnostics)
	mux.HandleFunc("PATCH /dsh/partner/stores/{storeId}/settings", protected.handlePartnerSettings)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/verifications", protected.handleFieldVerification)
	mux.HandleFunc("POST /dsh/captain/stores/{storeId}/pickup-readiness", protected.handleCaptainReadiness)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/governance", protected.handleOperatorGovernance)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/audit", protected.handleStoreAudit)
	mux.HandleFunc("GET /dsh/operator/home-discovery/{kind}", protected.handleHomeDiscoveryAdminList)
	mux.HandleFunc("POST /dsh/operator/home-discovery/{kind}", protected.handleHomeDiscoveryAdminCreate)
	mux.HandleFunc("PATCH /dsh/operator/home-discovery/{kind}/{itemId}", protected.handleHomeDiscoveryAdminUpdate)
	mux.HandleFunc("DELETE /dsh/operator/home-discovery/{kind}/{itemId}", protected.handleHomeDiscoveryAdminDelete)
	// Cart & Serviceability
	mux.HandleFunc("GET /dsh/client/cart", protected.handleGetCart)
	mux.HandleFunc("POST /dsh/client/cart/items", protected.handleUpsertCartItem)
	mux.HandleFunc("DELETE /dsh/client/cart/items/{itemId}", protected.handleRemoveCartItem)
	mux.HandleFunc("DELETE /dsh/client/cart", protected.handleClearCart)
	mux.HandleFunc("POST /dsh/client/cart/serviceability", protected.handleCartServiceability)
	mux.HandleFunc("GET /dsh/operator/carts", protected.handleOperatorCarts)
	// Checkout Intent & WLT Handoff
	mux.HandleFunc("POST /dsh/client/checkout-intents", protected.handleCreateCheckoutIntent)
	mux.HandleFunc("GET /dsh/client/checkout-intents/{intentId}", protected.handleGetCheckoutIntent)
	mux.HandleFunc("POST /dsh/client/checkout-intents/{intentId}/cancel", protected.handleCancelCheckoutIntent)
	mux.HandleFunc("GET /dsh/operator/checkout-intents", protected.handleOperatorCheckoutIntents)
	mux.HandleFunc("POST /dsh/internal/wlt/payment-session-events", protected.handleWltPaymentSessionEvent)
	// Order Fulfillment & Partner Acceptance
	mux.HandleFunc("POST /dsh/client/orders", protected.handleCreateOrder)
	mux.HandleFunc("GET /dsh/client/orders", protected.handleListClientOrders)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}", protected.handleGetClientOrder)
	mux.HandleFunc("GET /dsh/partner/orders", protected.handleListPartnerOrders)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/accept", protected.handleAcceptOrder)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/reject", protected.handleRejectOrder)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/preparing", protected.handleMarkPreparing)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/ready", protected.handleMarkReadyForPickup)
	mux.HandleFunc("GET /dsh/operator/orders", protected.handleListOperatorOrders)
	mux.HandleFunc("POST /dsh/operator/orders/{orderId}/cancel", protected.handleOperatorCancelOrder)
	// Dispatch & Captain Delivery Lifecycle
	mux.HandleFunc("POST /dsh/operator/dispatch/assignments", protected.handleCreateDispatchAssignment)
	mux.HandleFunc("GET /dsh/operator/dispatch/assignments", protected.handleListOperatorDispatchAssignments)
	mux.HandleFunc("GET /dsh/captain/dispatch/assignments", protected.handleListCaptainDispatchAssignments)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/accept", protected.handleAcceptDispatchAssignment)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/decline", protected.handleDeclineDispatchAssignment)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/status", protected.handleUpdateDeliveryStatus)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/pod", protected.handleSubmitDispatchPoD)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/location", protected.handlePushDispatchLocation)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/tracking", protected.handleGetClientTracking)

	// Governed read-only finance proxy — WLT internal financial reads are
	// service-authenticated; DSH surfaces must consume them through these
	// actor-authenticated routes, never directly from the browser.
	mux.HandleFunc("GET /dsh/control-panel/finance/settlements", protected.handleFinanceSettlements)
	mux.HandleFunc("GET /dsh/control-panel/finance/settlements/summary", protected.handleFinanceSettlementSummary)
	mux.HandleFunc("GET /dsh/control-panel/finance/refunds", protected.handleFinanceRefunds)
	mux.HandleFunc("GET /dsh/control-panel/finance/refunds/{refundId}", protected.handleFinanceRefundDetail)
	mux.HandleFunc("GET /dsh/control-panel/finance/ledger/entries", protected.handleFinanceLedgerEntries)
	mux.HandleFunc("GET /dsh/control-panel/finance/cod-records", protected.handleFinanceCodRecords)
	mux.HandleFunc("GET /dsh/control-panel/finance/commissions", protected.handleFinanceCommissions)
	mux.HandleFunc("GET /dsh/control-panel/finance/payout-requests", protected.handleFinancePayoutRequests)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve", protected.handleApproveFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject", protected.handleRejectFinancePayoutRequest)
	mux.HandleFunc("GET /dsh/captain/finance/cod-records", protected.handleCaptainFinanceCodRecords)

	// Field Finance
	mux.HandleFunc("GET /dsh/field/me/finance/wallet", protected.handleFieldMeWallet)
	mux.HandleFunc("GET /dsh/field/me/finance/commissions", protected.handleFieldMeCommissions)
	mux.HandleFunc("GET /dsh/field/me/finance/ledger-entries", protected.handleFieldMeLedgerEntries)
	mux.HandleFunc("GET /dsh/field/me/finance/payout-requests", protected.handleFieldMePayoutRequests)
	mux.HandleFunc("POST /dsh/field/me/finance/payout-requests", protected.handleSubmitFieldMePayoutRequest)

	// Field Verification & Store Quality Assurance
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/visits", protected.handleCreateFieldVisit)
	mux.HandleFunc("GET /dsh/field/stores/{storeId}/visits", protected.handleListFieldVisits)
	mux.HandleFunc("GET /dsh/field/work-queue", protected.handleFieldWorkQueue)
	mux.HandleFunc("POST /dsh/field/visits/{visitId}/complete", protected.handleCompleteFieldVisit)
	mux.HandleFunc("PUT /dsh/field/visits/{visitId}/checks", protected.handleUpsertReadinessCheck)
	mux.HandleFunc("GET /dsh/field/visits/{visitId}/checks", protected.handleListVisitChecks)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/escalations", protected.handleCreateReadinessEscalation)
	mux.HandleFunc("GET /dsh/operator/field-readiness/escalations", protected.handleListOperatorEscalations)
	mux.HandleFunc("PATCH /dsh/operator/field-readiness/escalations/{escalationId}", protected.handleUpdateEscalation)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/onboarding-status", protected.handlePartnerOnboardingStatus)

	// Catalog approval queue (partner submission -> marketing review -> catalog adoption)
	mux.HandleFunc("POST /dsh/catalog-approvals", protected.handleCreateCatalogApproval)
	mux.HandleFunc("GET /dsh/catalog-approvals", protected.handleListCatalogApprovals)
	mux.HandleFunc("GET /dsh/catalog-approvals/{recordId}", protected.handleGetCatalogApproval)
	mux.HandleFunc("POST /dsh/catalog-approvals/{recordId}/transition", protected.handleTransitionCatalogApproval)
	mux.HandleFunc("GET /dsh/partner/catalog-approvals", protected.handleListPartnerCatalogApprovals)

	// Central catalog sovereignty (governance/catalog/CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md)
	mux.HandleFunc("GET /dsh/operator/catalog/domains", protected.handleListCatalogDomains)
	mux.HandleFunc("POST /dsh/operator/catalog/domains", protected.handleCreateCatalogDomain)
	mux.HandleFunc("PATCH /dsh/operator/catalog/domains/{domainId}", protected.handleUpdateCatalogDomain)
	mux.HandleFunc("GET /dsh/operator/catalog/nodes", protected.handleListCatalogNodes)
	mux.HandleFunc("POST /dsh/operator/catalog/nodes", protected.handleCreateCatalogNode)
	mux.HandleFunc("PATCH /dsh/operator/catalog/nodes/{nodeId}", protected.handleUpdateCatalogNode)
	mux.HandleFunc("GET /dsh/operator/catalog/master-products", protected.handleListMasterProducts)
	mux.HandleFunc("POST /dsh/operator/catalog/master-products", protected.handleCreateMasterProduct)
	mux.HandleFunc("PATCH /dsh/operator/catalog/master-products/{productId}", protected.handleUpdateMasterProduct)
	mux.HandleFunc("GET /dsh/operator/catalog/product-proposals", protected.handleListProductProposals)
	mux.HandleFunc("POST /dsh/operator/catalog/product-proposals/{proposalId}/decision", protected.handleDecideProductProposal)
	mux.HandleFunc("POST /dsh/operator/catalog/product-proposals/{proposalId}/transition", protected.handleTransitionProductProposal)
	mux.HandleFunc("GET /dsh/operator/catalog/platform-policies", protected.handleListCatalogPolicies)
	mux.HandleFunc("PATCH /dsh/operator/catalog/platform-policies/{policyId}", protected.handleUpdateCatalogPolicy)
	mux.HandleFunc("PUT /dsh/operator/catalog/platform-policies/{policyId}", protected.handleUpdateCatalogPolicy)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/assortment", protected.handleOperatorGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}", protected.handleOperatorUpsertStoreAssortment)

	// Central catalog assets, seed status & entity images
	mux.HandleFunc("GET /dsh/operator/catalog/assets", protected.handleListCatalogAssets)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/upload-intents", protected.handleCreateAssetUploadIntent)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/complete", protected.handleCompleteAssetUpload)
	mux.HandleFunc("PATCH /dsh/operator/catalog/assets/{assetId}", protected.handleUpdateCatalogAsset)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/review", protected.handleReviewCatalogAsset)
	mux.HandleFunc("DELETE /dsh/operator/catalog/assets/{assetId}", protected.handleDeleteCatalogAsset)
	mux.HandleFunc("POST /dsh/operator/catalog/assets/{assetId}/link", protected.handleLinkCatalogAsset)
	mux.HandleFunc("DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}", protected.handleUnlinkCatalogAsset)
	mux.HandleFunc("GET /dsh/operator/catalog/asset-links", protected.handleListCatalogAssetLinks)
	mux.HandleFunc("GET /dsh/operator/catalog/seed-status", protected.handleCatalogSeedStatus)
	mux.HandleFunc("GET /dsh/operator/reels", protected.handleListReels)
	mux.HandleFunc("POST /dsh/operator/reels/{reelId}/review", protected.handleReviewReel)

	mux.HandleFunc("PUT /dsh/operator/catalog/domains/{domainId}/images/{role}", protected.handlePutDomainImage)
	mux.HandleFunc("PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}", protected.handlePutNodeImage)
	mux.HandleFunc("PUT /dsh/operator/catalog/master-products/{productId}/images/{role}", protected.handlePutMasterProductImage)
	mux.HandleFunc("PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}", protected.handlePutProductProposalImage)
	mux.HandleFunc("PUT /dsh/stores/{storeId}/images/{role}", protected.handlePutStoreImage)

	mux.HandleFunc("GET /dsh/partner/catalog/taxonomy", protected.handleCatalogTaxonomy)
	mux.HandleFunc("GET /dsh/partner/catalog/master-products", protected.handleListMasterProducts)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/assortment", protected.handlePartnerGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/partner/stores/{storeId}/assortment/{masterProductId}", protected.handlePartnerUpsertStoreAssortment)
	mux.HandleFunc("POST /dsh/partner/catalog/product-proposals", protected.handlePartnerCreateProductProposal)
	mux.HandleFunc("POST /dsh/partner/reels", protected.handleSubmitReel)

	mux.HandleFunc("GET /dsh/field/catalog/taxonomy", protected.handleCatalogTaxonomy)
	mux.HandleFunc("GET /dsh/field/catalog/master-products", protected.handleListMasterProducts)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/assortment", protected.handleFieldGetStoreAssortment)
	mux.HandleFunc("PUT /dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}", protected.handleFieldUpsertStoreAssortment)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/catalog/product-proposals", protected.handleFieldCreateProductProposal)

	// Support, Incidents & Escalation Room
	mux.HandleFunc("POST /dsh/support/tickets", protected.handleCreateSupportTicket)
	mux.HandleFunc("GET /dsh/support/tickets", protected.handleListMyTickets)
	mux.HandleFunc("GET /dsh/support/tickets/{ticketId}", protected.handleGetTicket)
	mux.HandleFunc("POST /dsh/support/tickets/{ticketId}/messages", protected.handleAddTicketMessage)
	mux.HandleFunc("GET /dsh/support/tickets/{ticketId}/messages", protected.handleListTicketMessages)
	mux.HandleFunc("GET /dsh/operator/support/tickets", protected.handleOperatorListTickets)
	mux.HandleFunc("PATCH /dsh/operator/support/tickets/{ticketId}", protected.handleOperatorUpdateTicket)
	mux.HandleFunc("POST /dsh/operator/incidents", protected.handleCreateIncident)
	mux.HandleFunc("GET /dsh/operator/incidents", protected.handleListIncidents)
	mux.HandleFunc("PATCH /dsh/operator/incidents/{incidentId}", protected.handleUpdateIncident)

	// Platform Analytics & Operational Reporting
	mux.HandleFunc("GET /dsh/operator/analytics/platform", protected.handlePlatformKpis)
	mux.HandleFunc("GET /dsh/operator/analytics/orders", protected.handleOrderAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/delivery", protected.handleDeliveryAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/support", protected.handleSupportAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/stores", protected.handleStoreAnalytics)
	mux.HandleFunc("GET /dsh/partner/analytics/performance", protected.handlePartnerPerformance)

	// Notifications & Actor Communication
	mux.HandleFunc("GET /dsh/notifications", protected.handleListNotifications)
	mux.HandleFunc("POST /dsh/notifications/{notificationId}/read", protected.handleMarkNotificationRead)
	mux.HandleFunc("POST /dsh/notifications/read-all", protected.handleMarkAllNotificationsRead)
	mux.HandleFunc("PUT /dsh/notifications/preferences", protected.handleUpdateNotificationPreferences)
	mux.HandleFunc("GET /dsh/operator/notifications/config", protected.handleListPlatformNotificationConfig)
	mux.HandleFunc("PUT /dsh/operator/notifications/config", protected.handleUpsertPlatformNotificationConfig)

	// Marketing Command Deck
	mux.HandleFunc("GET /dsh/operator/marketing/campaigns", protected.handleListCampaigns)
	mux.HandleFunc("POST /dsh/operator/marketing/campaigns", protected.handleCreateCampaign)
	mux.HandleFunc("GET /dsh/operator/marketing/campaigns/{campaignId}", protected.handleGetCampaign)
	mux.HandleFunc("PATCH /dsh/operator/marketing/campaigns/{campaignId}", protected.handleUpdateCampaign)
	mux.HandleFunc("DELETE /dsh/operator/marketing/campaigns/{campaignId}", protected.handleDeleteCampaign)
	mux.HandleFunc("GET /dsh/operator/marketing/tickers", protected.handleListTickers)
	mux.HandleFunc("POST /dsh/operator/marketing/tickers", protected.handleCreateTicker)
	mux.HandleFunc("PATCH /dsh/operator/marketing/tickers/{tickerId}", protected.handleUpdateTicker)
	mux.HandleFunc("DELETE /dsh/operator/marketing/tickers/{tickerId}", protected.handleDeleteTicker)
	mux.HandleFunc("GET /dsh/operator/marketing/partner-offers", protected.handleListPartnerOffers)
	mux.HandleFunc("PATCH /dsh/operator/marketing/partner-offers/{offerId}", protected.handleUpdatePartnerOffer)
	mux.HandleFunc("DELETE /dsh/operator/marketing/partner-offers/{offerId}", protected.handleArchivePartnerOffer)
	mux.HandleFunc("GET /dsh/partner/marketing/offers", protected.handleListOwnPartnerOffers)
	mux.HandleFunc("POST /dsh/partner/marketing/offers", protected.handleSubmitPartnerOffer)
	mux.HandleFunc("GET /dsh/operator/platform/zones", protected.handleListZones)
	mux.HandleFunc("POST /dsh/operator/platform/zones", protected.handleCreateZone)
	mux.HandleFunc("PATCH /dsh/operator/platform/zones/{zoneId}", protected.handleUpdateZone)
	mux.HandleFunc("GET /dsh/operator/platform/sla-rules", protected.handleListSlaRules)
	mux.HandleFunc("PUT /dsh/operator/platform/sla-rules", protected.handleUpsertSlaRules)
	mux.HandleFunc("GET /dsh/operator/platform/capacity", protected.handleGetCapacityConfig)
	mux.HandleFunc("PUT /dsh/operator/platform/capacity", protected.handleUpsertCapacityConfig)
	mux.HandleFunc("GET /dsh/operator/platform/serviceability/{zoneId}", protected.handleGetZoneServiceability)
	mux.HandleFunc("POST /dsh/operator/workforce/media/uploads", protected.handleProviderMediaUpload)
	mux.HandleFunc("GET /dsh/operator/platform/store-onboarding-fee", protected.handleGetStoreOnboardingFeePolicy)
	mux.HandleFunc("PUT /dsh/operator/platform/store-onboarding-fee", protected.handleUpsertStoreOnboardingFeePolicy)
	mux.HandleFunc("GET /dsh/platform/store-onboarding-fee", protected.handleGetStoreOnboardingFeeReference)

	// Partner Onboarding & Store Publication
	// Operator namespace
	mux.HandleFunc("GET /dsh/operator/partners", protected.handleListPartners)
	mux.HandleFunc("POST /dsh/operator/partners", protected.handleCreatePartner)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}", protected.handleGetPartner)
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/transition", protected.handleActivationTransition)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/readiness", protected.handleGetPartnerReadiness)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/documents", protected.handleListPartnerDocuments)
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/documents", protected.handleAddPartnerDocument)
	mux.HandleFunc("PATCH /dsh/operator/partners/{partnerId}/documents/{docId}/review", protected.handleReviewPartnerDocument)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/stores", protected.handleListPartnerStores)
	mux.HandleFunc("POST /dsh/operator/partners/{partnerId}/stores", protected.handleLinkPartnerStore)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/field-visits", protected.handleListPartnerFieldVisits)
	mux.HandleFunc("GET /dsh/operator/partners/{partnerId}/audit", protected.handleListPartnerAudit)

	// Field namespace
	mux.HandleFunc("GET /dsh/field/partners", protected.handleFieldListPartnerDrafts)
	mux.HandleFunc("POST /dsh/field/partners/drafts", protected.handleFieldCreatePartnerDraft)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}", protected.handleFieldGetPartnerDraft)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/readiness", protected.handleFieldGetPartnerReadiness)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/documents", protected.handleFieldListPartnerDocuments)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/field-visits", protected.handleFieldListPartnerFieldVisits)
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}", protected.handleFieldUpdatePartnerDraft)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/documents", protected.handleFieldUploadPartnerDocument)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/visits", protected.handleFieldCreatePartnerVisit)
	mux.HandleFunc("POST /dsh/field/partners/{partnerId}/submit", protected.handleFieldSubmitPartnerDraft)
	mux.HandleFunc("GET /dsh/field/partners/{partnerId}/store", protected.handleFieldGetPartnerStore)
	mux.HandleFunc("PATCH /dsh/field/partners/{partnerId}/store", protected.handleFieldUpdatePartnerStore)

	// Partner self namespace
	mux.HandleFunc("GET /dsh/partner/activation/status", protected.handlePartnerActivationStatus)
	mux.HandleFunc("GET /dsh/partner/activation/readiness", protected.handlePartnerActivationReadiness)

	// Administration, Roles & Activation
	mux.HandleFunc("GET /dsh/operator/admin/roles", protected.handleListRoles)
	mux.HandleFunc("POST /dsh/operator/admin/roles", protected.handleCreateRole)
	mux.HandleFunc("GET /dsh/operator/admin/staff", protected.handleListStaff)
	mux.HandleFunc("POST /dsh/operator/admin/staff/{staffId}/roles", protected.handleAssignStaffRole)
	mux.HandleFunc("GET /dsh/operator/admin/partners", protected.handleListPartnerActivations)
	mux.HandleFunc("POST /dsh/operator/admin/partners/{partnerId}/activate", protected.handleActivatePartner)
	mux.HandleFunc("POST /dsh/operator/admin/partners/{partnerId}/block", protected.handleBlockPartner)
	mux.HandleFunc("GET /dsh/operator/admin/captains", protected.handleListCaptainCredentials)
	mux.HandleFunc("POST /dsh/operator/admin/captains/{captainId}/credential", protected.handleUpsertCaptainCredential)
	mux.HandleFunc("GET /dsh/operator/admin/audit", protected.handleListAdminAudit)

	// Catch-all 404 handler for routes not found
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "Route not found")
	})

	return mux
}

func CorsMiddleware(authMode string, next http.Handler) http.Handler {
	localCorsOrigins := map[string]bool{}
	if authMode != "" {
		localCorsOrigins["http://localhost:13000"] = true
		localCorsOrigins["http://127.0.0.1:13000"] = true
		localCorsOrigins["http://localhost:13002"] = true
		localCorsOrigins["http://127.0.0.1:13002"] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "dsh")

		origin := r.Header.Get("Origin")
		if localCorsOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Correlation-ID")
			w.Header().Set("Vary", "Origin")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
