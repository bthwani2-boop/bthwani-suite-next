package http

import (
	"database/sql"
	"net/http"

	"dsh-api/internal/auth"
	"dsh-api/internal/health"
	"dsh-api/internal/homediscovery"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func NewRouter(db *sql.DB, identityClient *auth.Client, wltClient *wlt.Client) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /dsh/health", health.HandleHealth)
	mux.HandleFunc("GET /dsh/readiness", health.HandleReadiness(db))
	mux.HandleFunc("GET /dsh/stores", store.HandleListStores(db))
	mux.HandleFunc("GET /dsh/stores/{storeId}", store.HandleGetStore(db))
	mux.HandleFunc("GET /dsh/stores/{storeId}/catalog", handlePublicCatalog(db))
	mux.HandleFunc("GET /dsh/home-discovery", homediscovery.HandleHomeDiscovery(db))
	protected := newProtectedStoreServer(db, identityClient, wltClient)
	mux.HandleFunc("GET /dsh/store-context", protected.handleStoreContext)
	mux.HandleFunc("GET /dsh/operator/stores", protected.handleOperatorStores)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}", protected.handleOperatorStoreDetail)
	mux.HandleFunc("PATCH /dsh/partner/stores/{storeId}/settings", protected.handlePartnerSettings)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/verifications", protected.handleFieldVerification)
	mux.HandleFunc("POST /dsh/captain/stores/{storeId}/pickup-readiness", protected.handleCaptainReadiness)
	mux.HandleFunc("POST /dsh/operator/stores/{storeId}/governance", protected.handleOperatorGovernance)
	mux.HandleFunc("GET /dsh/operator/stores/{storeId}/audit", protected.handleStoreAudit)
	mux.HandleFunc("GET /dsh/operator/home-discovery/{kind}", protected.handleHomeDiscoveryAdminList)
	mux.HandleFunc("POST /dsh/operator/home-discovery/{kind}", protected.handleHomeDiscoveryAdminCreate)
	mux.HandleFunc("PATCH /dsh/operator/home-discovery/{kind}/{itemId}", protected.handleHomeDiscoveryAdminUpdate)
	mux.HandleFunc("DELETE /dsh/operator/home-discovery/{kind}/{itemId}", protected.handleHomeDiscoveryAdminDelete)
	mux.HandleFunc("GET /dsh/partner/catalog", protected.handlePartnerCatalog)
	mux.HandleFunc("POST /dsh/partner/catalog/categories", protected.handlePartnerCategoryCreate)
	mux.HandleFunc("PATCH /dsh/partner/catalog/categories/{categoryId}", protected.handlePartnerCategoryUpdate)
	mux.HandleFunc("DELETE /dsh/partner/catalog/categories/{categoryId}", protected.handlePartnerCategoryDelete)
	mux.HandleFunc("POST /dsh/partner/catalog/products", protected.handlePartnerProductCreate)
	mux.HandleFunc("PATCH /dsh/partner/catalog/products/{productId}", protected.handlePartnerProductUpdate)
	mux.HandleFunc("DELETE /dsh/partner/catalog/products/{productId}", protected.handlePartnerProductDelete)
	mux.HandleFunc("POST /dsh/partner/catalog/media/upload-intents", protected.handleUploadIntent)
	mux.HandleFunc("PATCH /dsh/partner/catalog/media/{mediaId}/complete", protected.handleCompleteMedia)
	mux.HandleFunc("DELETE /dsh/partner/catalog/media/{mediaId}", protected.handleDeleteMedia)
	mux.HandleFunc("POST /dsh/partner/catalog/submit", protected.handleSubmitCatalog)
	mux.HandleFunc("GET /dsh/operator/catalog/submissions", protected.handleCatalogSubmissions)
	mux.HandleFunc("POST /dsh/operator/catalog/{storeId}/decision", protected.handleCatalogDecision)
	mux.HandleFunc("GET /dsh/operator/catalog/{storeId}/audit", protected.handleCatalogAudit)
	// DSH-004: Cart & Serviceability
	mux.HandleFunc("GET /dsh/client/cart", protected.handleGetCart)
	mux.HandleFunc("POST /dsh/client/cart/items", protected.handleUpsertCartItem)
	mux.HandleFunc("DELETE /dsh/client/cart/items/{itemId}", protected.handleRemoveCartItem)
	mux.HandleFunc("DELETE /dsh/client/cart", protected.handleClearCart)
	mux.HandleFunc("POST /dsh/client/cart/serviceability", protected.handleCartServiceability)
	mux.HandleFunc("GET /dsh/operator/carts", protected.handleOperatorCarts)
	// DSH-005: Checkout Intent & WLT Handoff
	mux.HandleFunc("POST /dsh/client/checkout-intents", protected.handleCreateCheckoutIntent)
	mux.HandleFunc("GET /dsh/client/checkout-intents/{intentId}", protected.handleGetCheckoutIntent)
	mux.HandleFunc("POST /dsh/client/checkout-intents/{intentId}/cancel", protected.handleCancelCheckoutIntent)
	mux.HandleFunc("GET /dsh/operator/checkout-intents", protected.handleOperatorCheckoutIntents)
	// DSH-006: Order Fulfillment & Partner Acceptance
	mux.HandleFunc("POST /dsh/client/orders", protected.handleCreateOrder)
	mux.HandleFunc("GET /dsh/client/orders", protected.handleListClientOrders)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}", protected.handleGetClientOrder)
	mux.HandleFunc("GET /dsh/partner/orders", protected.handleListPartnerOrders)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/accept", protected.handleAcceptOrder)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/reject", protected.handleRejectOrder)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/preparing", protected.handleMarkPreparing)
	mux.HandleFunc("POST /dsh/partner/orders/{orderId}/ready", protected.handleMarkReadyForPickup)
	mux.HandleFunc("GET /dsh/operator/orders", protected.handleListOperatorOrders)
	// DSH-007: Dispatch & Captain Delivery Lifecycle
	mux.HandleFunc("POST /dsh/operator/dispatch/assignments", protected.handleCreateDispatchAssignment)
	mux.HandleFunc("GET /dsh/operator/dispatch/assignments", protected.handleListOperatorDispatchAssignments)
	mux.HandleFunc("GET /dsh/captain/dispatch/assignments", protected.handleListCaptainDispatchAssignments)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/accept", protected.handleAcceptDispatchAssignment)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/decline", protected.handleDeclineDispatchAssignment)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/status", protected.handleUpdateDeliveryStatus)
	mux.HandleFunc("POST /dsh/captain/dispatch/assignments/{assignmentId}/pod", protected.handleSubmitDispatchPoD)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/tracking", protected.handleGetClientTracking)

	// DSH-008: Field Verification & Store Quality Assurance
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/visits", protected.handleCreateFieldVisit)
	mux.HandleFunc("GET /dsh/field/stores/{storeId}/visits", protected.handleListFieldVisits)
	mux.HandleFunc("POST /dsh/field/visits/{visitId}/complete", protected.handleCompleteFieldVisit)
	mux.HandleFunc("PUT /dsh/field/visits/{visitId}/checks", protected.handleUpsertReadinessCheck)
	mux.HandleFunc("GET /dsh/field/visits/{visitId}/checks", protected.handleListVisitChecks)
	mux.HandleFunc("POST /dsh/field/stores/{storeId}/escalations", protected.handleCreateReadinessEscalation)
	mux.HandleFunc("GET /dsh/operator/field-readiness/escalations", protected.handleListOperatorEscalations)
	mux.HandleFunc("PATCH /dsh/operator/field-readiness/escalations/{escalationId}", protected.handleUpdateEscalation)
	mux.HandleFunc("GET /dsh/partner/stores/{storeId}/onboarding-status", protected.handlePartnerOnboardingStatus)

	// DSH-009: Support, Incidents & Escalation Room
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

	// DSH-010: Platform Analytics & Operational Reporting
	mux.HandleFunc("GET /dsh/operator/analytics/platform", protected.handlePlatformKpis)
	mux.HandleFunc("GET /dsh/operator/analytics/orders", protected.handleOrderAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/delivery", protected.handleDeliveryAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/support", protected.handleSupportAnalytics)
	mux.HandleFunc("GET /dsh/operator/analytics/stores", protected.handleStoreAnalytics)
	mux.HandleFunc("GET /dsh/partner/analytics/performance", protected.handlePartnerPerformance)

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
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
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
