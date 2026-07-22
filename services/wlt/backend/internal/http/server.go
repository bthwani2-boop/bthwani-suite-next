package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
	"wlt-api/internal/commercial"
	"wlt-api/internal/health"
	"wlt-api/internal/ledger"
	"wlt-api/internal/payment"
	"wlt-api/internal/payout"
	"wlt-api/internal/promotionfunding"
	"wlt-api/internal/reconciliation"
	"wlt-api/internal/reference"
	"wlt-api/internal/refund"
	"wlt-api/internal/settlement"
	"wlt-api/internal/shared"
	"wlt-api/internal/wallet"
)

// NewRouter builds the WLT HTTP router. Every broad financial read requires
// an authenticated DSH service caller. Every mutation additionally requires
// WLT_MUTATIONS_ENABLED, so configuration and authorization are independent
// fail-closed gates.
func NewRouter(db *sql.DB, mutationsEnabled bool) *http.ServeMux {
	mux := http.NewServeMux()
	gate := newMutationGate(mutationsEnabled)
	readGate := requireInternalFinancialRead
	serviceAuth := requireMutationServiceAuth

	mux.HandleFunc("GET /wlt/health", health.HandleHealth)
	mux.HandleFunc("GET /wlt/readiness", health.HandleReadiness(db))

	mux.HandleFunc("GET /wlt/references/payment-status", reference.HandleGetPaymentStatus(db))
	mux.HandleFunc("GET /wlt/references/settlement-status", reference.HandleGetSettlementStatus(db))
	mux.HandleFunc("GET /wlt/references/refund-status", reference.HandleGetRefundStatus(db))
	mux.HandleFunc("GET /wlt/references/wallet-status", reference.HandleGetWalletStatus(db))

	mux.HandleFunc("GET /wlt/wallets/{actorType}/{actorId}", readGate(wallet.HandleGetWallet(db)))
	mux.HandleFunc("POST /wlt/payment-sessions", gate(serviceAuth(reference.HandleCreatePaymentSessionTrustedDsh(db))))
	mux.HandleFunc("GET /wlt/payment-sessions/{paymentSessionId}", readGate(reference.HandleGetPaymentSessionTrustedDsh(db)))
	mux.HandleFunc("GET /wlt/payment-sessions/{paymentSessionId}/timeline", readGate(payment.HandleGetPaymentSessionTimeline(db)))

	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/authorize", gate(serviceAuth(payment.HandleGovernedPaymentOperation(db, "authorize", payment.HandleAuthorizeSessionSovereign(db)))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/capture", gate(serviceAuth(payment.HandleGovernedPaymentOperation(db, "capture", payment.HandleCaptureSessionSovereign(db)))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/refresh-provider-status", gate(serviceAuth(payment.HandleGovernedPaymentOperation(db, "provider_status_refresh", payment.HandleRefreshProviderStatus(db)))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/expire", gate(serviceAuth(payment.HandleTenantScopedPaymentSession(db, payment.HandleExpireSession(db)))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cod-collect", gate(serviceAuth(payment.HandleCodCollectionViaPaymentSessionBlocked(db))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cancel-for-order", gate(serviceAuth(payment.HandleTenantScopedPaymentSession(db, payment.HandleGovernedSessionCancellation(db)))))
	mux.HandleFunc("POST /wlt/provider/webhooks/payment", gate(payment.HandlePaymentProviderWebhook(db)))

	// Refund routes are service-authenticated and tenant-scoped. The trusted
	// X-Tenant-ID must own the referenced refund before any read or mutation.
	mux.HandleFunc("POST /wlt/refunds", gate(serviceAuth(refund.RequireTenantScope(db, refund.HandleCreateGovernedRefund(db)))))
	mux.HandleFunc("GET /wlt/refunds/{refundId}", readGate(refund.RequireTenantScope(db, refund.HandleGetGovernedRefund(db))))
	mux.HandleFunc("GET /wlt/refunds", readGate(refund.RequireTenantScope(db, refund.HandleListGovernedRefunds(db))))
	mux.HandleFunc("GET /wlt/refunds/{refundId}/audit", readGate(refund.RequireTenantScope(db, refund.HandleListGovernedRefundAudit(db))))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/approve", gate(serviceAuth(refund.RequireTenantScope(db, refund.HandleApproveGovernedRefund(db)))))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/complete", gate(serviceAuth(refund.RequireTenantScope(db, refund.HandleCompleteGovernedRefund(db)))))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/reject", gate(serviceAuth(refund.RequireTenantScope(db, refund.HandleRejectGovernedRefund(db)))))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/reconcile", gate(serviceAuth(refund.RequireTenantScope(db, refund.HandleReconcileGovernedRefund(db)))))

	mux.HandleFunc("GET /wlt/settlements/summary", readGate(settlement.HandleGetSettlementSummaryGoverned(db)))
	mux.HandleFunc("POST /wlt/settlements", gate(serviceAuth(settlement.HandleCreateEvidenceBackedSettlement(db))))
	mux.HandleFunc("GET /wlt/settlements/{settlementId}/evidence", readGate(settlement.HandleListSettlementEvidence(db)))
	mux.HandleFunc("GET /wlt/settlements/{settlementId}", readGate(settlement.HandleGetSettlement(db)))
	mux.HandleFunc("GET /wlt/settlements", readGate(settlement.HandleListSettlements(db)))
	mux.HandleFunc("POST /wlt/settlements/{settlementId}/post", gate(serviceAuth(settlement.HandlePostSettlement(db))))
	mux.HandleFunc("PUT /wlt/settlement-policies/{partnerId}", gate(serviceAuth(settlement.HandleUpsertGovernedSettlementPolicy(db))))

	mux.HandleFunc("POST /wlt/cod-records", gate(serviceAuth(cod.HandleCreateCodRecordAtomic(db))))
	mux.HandleFunc("GET /wlt/cod-records/{codRecordId}", readGate(cod.HandleGetCodRecord(db)))
	mux.HandleFunc("GET /wlt/cod-records", readGate(cod.HandleListCodRecords(db)))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/collect", gate(serviceAuth(cod.HandleCollectCodSovereign(db))))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/remit", gate(serviceAuth(cod.HandleRemitCodSovereign(db))))
	mux.HandleFunc("PUT /wlt/commission-policies", gate(serviceAuth(cod.HandleUpsertGovernedCommissionPolicy(db))))
	mux.HandleFunc("POST /wlt/commissions", gate(serviceAuth(cod.HandleCreateGovernedCommission(db))))
	mux.HandleFunc("GET /wlt/commissions/{commissionId}", readGate(cod.HandleGetGovernedCommission(db)))
	mux.HandleFunc("GET /wlt/commissions", readGate(cod.HandleListGovernedCommissions(db)))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/adjust", gate(serviceAuth(cod.HandleAdjustGovernedCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/confirm", gate(serviceAuth(cod.HandleConfirmGovernedCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/settle", gate(serviceAuth(cod.HandleSettleGovernedCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/reject", gate(serviceAuth(cod.HandleRejectGovernedCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/reverse", gate(serviceAuth(cod.HandleReverseGovernedCommission(db))))

	mux.HandleFunc("POST /wlt/ledger/entries", gate(serviceAuth(ledger.HandleAppendLedgerEntry(db))))
	mux.HandleFunc("GET /wlt/ledger/entries/{entryId}", readGate(ledger.HandleGetLedgerEntry(db)))
	mux.HandleFunc("GET /wlt/ledger/entries", readGate(ledger.HandleListLedgerEntries(db)))
	mux.HandleFunc("GET /wlt/ledger/financial-summary", readGate(ledger.HandleFinancialSummary(db)))

	mux.HandleFunc("PUT /wlt/payout-destinations/{partnerId}", gate(serviceAuth(payout.HandleUpsertPayoutDestinationGoverned(db))))
	mux.HandleFunc("GET /wlt/payout-destinations/{partnerId}", readGate(payout.HandleGetPayoutDestination(db)))
	mux.HandleFunc("POST /wlt/payout-destinations/{partnerId}/deactivate", gate(serviceAuth(payout.HandleDeactivatePayoutDestination(db))))

	mux.HandleFunc("GET /wlt/reconciliation-cases", readGate(reconciliation.HandleListCases(db)))
	mux.HandleFunc("GET /wlt/reconciliation-cases/{caseId}", readGate(reconciliation.HandleGetCase(db)))
	mux.HandleFunc("POST /wlt/reconciliation-cases/{caseId}/assign", gate(serviceAuth(reconciliation.HandleAssignCase(db))))
	mux.HandleFunc("POST /wlt/reconciliation-cases/{caseId}/resolve", gate(serviceAuth(reconciliation.HandleResolveCase(db))))

	mux.HandleFunc("POST /wlt/payout-requests", gate(serviceAuth(payout.HandleCreatePayoutRequest(db))))
	mux.HandleFunc("GET /wlt/payout-requests", readGate(payout.HandleListPayoutRequestsWithProviderProof(db)))
	mux.HandleFunc("GET /wlt/payout-requests/{payoutId}", readGate(payout.HandleGetPayoutRequestWithProviderProof(db)))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/approve", gate(serviceAuth(payout.HandleApprovePayoutRequestSovereign(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/reject", gate(serviceAuth(payout.HandleRejectPayoutRequestSovereign(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/process", gate(serviceAuth(payout.HandleProcessPayoutRequestSovereign(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/complete", gate(serviceAuth(payout.HandleCompletePayoutRequestSovereign(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/fail", gate(serviceAuth(payout.HandleFailPayoutRequestSovereign(db))))

	mux.HandleFunc("GET /wlt/commercial/summary", readGate(commercial.HandleGetSummary(db)))
	mux.HandleFunc("GET /wlt/commercial/products/{productReference}", readGate(commercial.HandleGetProduct(db)))
	mux.HandleFunc("POST /wlt/commercial/products", gate(serviceAuth(commercial.HandleCreateProduct(db))))
	mux.HandleFunc("PATCH /wlt/commercial/products/{productReference}", gate(serviceAuth(commercial.HandleUpdateProductGoverned(db))))
	mux.HandleFunc("POST /wlt/commercial/payment-sessions", gate(serviceAuth(commercial.HandleCreateSubscriptionPaymentSession(db))))
	mux.HandleFunc("GET /wlt/commercial/clients/{clientId}/benefits", readGate(commercial.HandleGetClientBenefitsGoverned(db)))
	mux.HandleFunc("POST /wlt/commercial/loyalty-entries", gate(serviceAuth(commercial.HandleAppendLoyaltyEntryGoverned(db))))
	mux.HandleFunc("POST /wlt/commercial/subscriptions", gate(serviceAuth(commercial.HandleActivateSubscriptionLifecycle(db))))
	mux.HandleFunc("GET /wlt/commercial/subscriptions/{subscriptionId}/lifecycle", readGate(commercial.HandleGetSubscriptionLifecycle(db)))
	mux.HandleFunc("POST /wlt/commercial/subscriptions/{subscriptionId}/renew", gate(serviceAuth(commercial.HandleRenewSubscriptionLifecycle(db))))
	mux.HandleFunc("POST /wlt/commercial/subscriptions/{subscriptionId}/cancel", gate(serviceAuth(commercial.HandleCancelSubscriptionLifecycle(db))))
	mux.HandleFunc("POST /wlt/commercial/subscriptions/expire-due", gate(serviceAuth(commercial.HandleExpireDueSubscriptions(db))))

	mux.HandleFunc("POST /wlt/promotion-funding/reservations", gate(serviceAuth(promotionfunding.HandleReserve(db))))
	mux.HandleFunc("GET /wlt/promotion-funding/reservations/{reservationId}", readGate(promotionfunding.HandleGet(db)))
	mux.HandleFunc("POST /wlt/promotion-funding/reservations/{reservationId}/commit", gate(serviceAuth(promotionfunding.HandleCommit(db))))
	mux.HandleFunc("POST /wlt/promotion-funding/reservations/{reservationId}/release", gate(serviceAuth(promotionfunding.HandleRelease(db))))
	mux.HandleFunc("POST /wlt/promotion-funding/reservations/{reservationId}/reverse", gate(serviceAuth(promotionfunding.HandleReverse(db))))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "Route not found")
	})
	return mux
}

func CorsMiddleware(authMode string, next http.Handler) http.Handler {
	localCorsOrigin := ""
	if authMode != "" {
		localCorsOrigin = "http://localhost:13000"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Service", "wlt")
		origin := r.Header.Get("Origin")
		if localCorsOrigin != "" && origin == localCorsOrigin {
			w.Header().Set("Access-Control-Allow-Origin", localCorsOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-ID, Idempotency-Key, X-Service-Caller, X-Tenant-ID")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func requireInternalFinancialRead(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh") {
			return
		}
		next(w, r)
	}
}

func requireMutationServiceAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh") {
			return
		}
		next(w, r)
	}
}

func newMutationGate(mutationsEnabled bool) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		if mutationsEnabled {
			return next
		}
		return func(w http.ResponseWriter, r *http.Request) {
			shared.SendError(w, http.StatusForbidden, "FEATURE_NOT_ENABLED", "this financial mutation route is not enabled (WLT_MUTATIONS_ENABLED is not true)")
		}
	}
}
