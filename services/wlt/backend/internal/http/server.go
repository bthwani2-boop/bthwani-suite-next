package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
	"wlt-api/internal/collateral"
	"wlt-api/internal/commercial"
	"wlt-api/internal/health"
	"wlt-api/internal/ledger"
	"wlt-api/internal/payment"
	"wlt-api/internal/payout"
	"wlt-api/internal/penalty"
	"wlt-api/internal/promotionfunding"
	"wlt-api/internal/provider"
	"wlt-api/internal/reconciliation"
	"wlt-api/internal/reference"
	"wlt-api/internal/refund"
	"wlt-api/internal/settlement"
	"wlt-api/internal/shared"
	"wlt-api/internal/wallet"
)

type routeKind int

const (
	routePublic routeKind = iota
	routeRead
	routeMutation
)

type registeredRoute struct {
	Pattern     string
	Kind        routeKind
	ServiceAuth bool
}

type routeRegistrar func(pattern string, handler http.HandlerFunc)

func NewRouter(db *sql.DB, mutationsEnabled bool, ds wallet.DecisionService, rail provider.CashInRail) *http.ServeMux {
	mux, _ := newRouterWithRoutes(db, mutationsEnabled, ds, rail)
	return mux
}

func newRouterWithRoutes(db *sql.DB, mutationsEnabled bool, ds wallet.DecisionService, rail provider.CashInRail) (*http.ServeMux, []registeredRoute) {
	mux := http.NewServeMux()
	routes := make([]registeredRoute, 0, 128)
	gate := newMutationGate(mutationsEnabled)
	killGate := newKillSwitchGate(ds)

	public := routeRegistrar(func(pattern string, handler http.HandlerFunc) {
		routes = append(routes, registeredRoute{Pattern: pattern, Kind: routePublic})
		mux.HandleFunc(pattern, handler)
	})
	read := routeRegistrar(func(pattern string, handler http.HandlerFunc) {
		routes = append(routes, registeredRoute{Pattern: pattern, Kind: routeRead, ServiceAuth: true})
		mux.HandleFunc(pattern, requireInternalFinancialRead(handler))
	})
	mutation := routeRegistrar(func(pattern string, handler http.HandlerFunc) {
		routes = append(routes, registeredRoute{Pattern: pattern, Kind: routeMutation, ServiceAuth: true})
		mux.HandleFunc(pattern, gate(requireMutationServiceAuth(killGate(handler))))
	})
	workforceMutation := routeRegistrar(func(pattern string, handler http.HandlerFunc) {
		routes = append(routes, registeredRoute{Pattern: pattern, Kind: routeMutation, ServiceAuth: true})
		mux.HandleFunc(pattern, gate(requireWorkforceMutationServiceAuth(killGate(handler))))
	})
	workforceRead := routeRegistrar(func(pattern string, handler http.HandlerFunc) {
		routes = append(routes, registeredRoute{Pattern: pattern, Kind: routeRead, ServiceAuth: true})
		mux.HandleFunc(pattern, requireWorkforceMutationServiceAuth(handler))
	})
	providerMutation := routeRegistrar(func(pattern string, handler http.HandlerFunc) {
		routes = append(routes, registeredRoute{Pattern: pattern, Kind: routeMutation})
		mux.HandleFunc(pattern, gate(killGate(handler)))
	})

	public("GET /wlt/health", health.HandleHealth)
	public("GET /wlt/readiness", health.HandleReadiness(db, ds))

	read("GET /wlt/references/payment-status", reference.HandleGetPaymentStatus(db))
	read("GET /wlt/references/settlement-status", reference.HandleGetSettlementStatus(db))
	read("GET /wlt/references/refund-status", reference.HandleGetRefundStatus(db))
	read("GET /wlt/references/wallet-status", reference.HandleGetWalletStatus(db))
	read("GET /wlt/references/field-commission", reference.HandleGetFieldCommission(db))

	read("GET /wlt/wallets/{actorType}/{actorId}", wallet.HandleGetWallet(db))
	read("GET /wlt/captain-collateral/{captainId}", collateral.HandleGet(db))
	mutation("PUT /wlt/captain-collateral-policy", collateral.HandleUpsertPolicy(db))
	mutation("POST /wlt/captain-collateral/allocate", collateral.HandleAllocate(db))
	mutation("POST /wlt/captain-collateral/release", collateral.HandleRelease(db))
	mutation("POST /wlt/payment-sessions", reference.HandleCreatePaymentSessionTrustedDsh(db))
	read("GET /wlt/payment-sessions/{paymentSessionId}", reference.HandleGetPaymentSessionTrustedDsh(db))
	read("GET /wlt/payment-sessions/by-checkout-intent/{checkoutIntentId}/lookup", reference.HandleGetPaymentSessionByCheckoutIntentTrustedDsh(db))
	read("GET /wlt/payment-sessions/{paymentSessionId}/timeline", payment.HandleGetPaymentSessionTimeline(db))

	mutation("POST /wlt/payment-sessions/{paymentSessionId}/authorize", payment.HandleGovernedPaymentOperation(db, "authorize", payment.HandleAuthorizeSession(db, rail)))
	mutation("POST /wlt/payment-sessions/{paymentSessionId}/capture", payment.HandleGovernedPaymentOperation(db, "capture", payment.HandleCaptureSession(db, rail)))
	mutation("POST /wlt/payment-sessions/{paymentSessionId}/refresh-provider-status", payment.HandleGovernedPaymentOperation(db, "provider_status_refresh", payment.HandleRefreshProviderStatus(db, rail)))
	mutation("POST /wlt/payment-sessions/{paymentSessionId}/expire", payment.HandleOperatorContextScopedPaymentSession(db, payment.HandleExpireSession(db)))

	mutation("POST /wlt/topup-sessions", reference.HandleCreateTopUpSessionTrustedDsh(db))
	mutation("POST /wlt/topup-sessions/{paymentSessionId}/authorize", payment.HandleGovernedPaymentOperation(db, "authorize", payment.HandleAuthorizeTopUpSession(db, rail)))
	mutation("POST /wlt/topup-sessions/{paymentSessionId}/capture", payment.HandleGovernedPaymentOperation(db, "capture", payment.HandleCaptureTopUpSession(db, rail)))
	providerMutation("POST /wlt/provider/webhooks/payment", payment.HandlePaymentProviderWebhook(db))

	mutation("POST /wlt/refunds", refund.RequireOperatorContextScope(db, refund.RequireMutationIdempotency(db, "create", refund.HandleCreateGovernedRefund(db))))
	read("GET /wlt/refunds/{refundId}", refund.RequireOperatorContextScope(db, refund.HandleGetGovernedRefund(db)))
	read("GET /wlt/refunds", refund.RequireOperatorContextScope(db, refund.HandleListGovernedRefunds(db)))
	read("GET /wlt/refunds/{refundId}/audit", refund.RequireOperatorContextScope(db, refund.HandleListGovernedRefundAudit(db)))
	mutation("POST /wlt/refunds/{refundId}/approve", refund.RequireOperatorContextScope(db, refund.RequireMutationIdempotency(db, "approve", refund.HandleApproveGovernedRefund(db))))
	mutation("POST /wlt/refunds/{refundId}/complete", refund.RequireOperatorContextScope(db, refund.RequireMutationIdempotency(db, "complete", refund.HandleCompleteGovernedRefundDurable(db, rail))))
	mutation("POST /wlt/refunds/{refundId}/reject", refund.RequireOperatorContextScope(db, refund.RequireMutationIdempotency(db, "reject", refund.HandleRejectGovernedRefund(db))))
	mutation("POST /wlt/refunds/{refundId}/reconcile", refund.RequireOperatorContextScope(db, refund.RequireMutationIdempotency(db, "reconcile", refund.HandleReconcileGovernedRefund(db))))

	read("GET /wlt/settlements/summary", settlement.HandleGetSettlementSummaryGoverned(db))
	mutation("POST /wlt/settlements", settlement.HandleCreateEvidenceBackedSettlement(db))
	read("GET /wlt/settlements/{settlementId}/evidence", settlement.HandleListSettlementEvidence(db))
	read("GET /wlt/settlements/{settlementId}", shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{Table: "wlt_settlements", IDPathValue: "settlementId"}, settlement.HandleGetSettlement(db)))
	read("GET /wlt/settlements", shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{Table: "wlt_settlements", ListPath: "/wlt/settlements"}, settlement.HandleListSettlements(db)))
	mutation("POST /wlt/settlements/{settlementId}/post", settlement.HandlePostSettlement(db))
	mutation("POST /wlt/settlement-batches", settlement.HandleCreateSettlementBatch(db))
	mutation("POST /wlt/settlement-batches/{batchId}/freeze", settlement.HandleFreezeSettlementBatch(db))
	read("GET /wlt/settlement-batches/{batchId}/export", settlement.HandleExportSettlementBatch(db))
	mutation("POST /wlt/settlement-batches/{batchId}/evidence", payout.HandleRecordManualTransferExecution(db))
	mutation("POST /wlt/settlement-batches/{batchId}/evidence/{evidenceId}/verify", payout.HandleVerifyManualTransferExecution(db))
	mutation("POST /wlt/finance-close", settlement.HandleExecuteDailyFinanceClose(db))
	mutation("PUT /wlt/settlement-policies/{partnerId}", settlement.HandleUpsertGovernedSettlementPolicyIdempotent(db))
	mutation("POST /wlt/cod-reservations/reserve", cod.HandleReserveCodCapacity(db))
	mutation("POST /wlt/cod-reservations/release", cod.HandleReleaseCodReservation(db))
	mutation("POST /wlt/cod-reservations/finalize", cod.HandleFinalizeCodReservation(db))
	read("GET /wlt/cod-reservations/{orderId}", cod.HandleGetCodReservation(db))
	mutation("PUT /wlt/commission-policies", cod.HandleUpsertGovernedCommissionPolicyIdempotent(db))
	mutation("PUT /wlt/provider-penalty-policies/{policyId}", penalty.HandleUpsertPolicy(db))
	mutation("POST /wlt/commissions", cod.HandleCreateCanonicalCommission(db))
	read("GET /wlt/commissions/{commissionId}", shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{Table: "wlt_commissions", IDPathValue: "commissionId"}, cod.HandleGetGovernedCommission(db)))
	read("GET /wlt/commissions", shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{Table: "wlt_commissions", ListPath: "/wlt/commissions"}, cod.HandleListGovernedCommissions(db)))
	mutation("POST /wlt/commissions/{commissionId}/adjust", cod.HandleAdjustGovernedCommission(db))
	mutation("POST /wlt/commissions/{commissionId}/confirm", cod.HandleConfirmGovernedCommissionIdempotent(db))
	mutation("POST /wlt/commissions/{commissionId}/settle", cod.HandleSettleGovernedCommissionIdempotent(db))
	mutation("POST /wlt/commissions/{commissionId}/reject", cod.HandleRejectGovernedCommissionIdempotent(db))
	mutation("POST /wlt/commissions/{commissionId}/reverse", cod.HandleReverseGovernedCommissionIdempotent(db))

	workforceMutation("POST /wlt/provider-penalties", penalty.HandlePost(db))
	workforceMutation("POST /wlt/provider-penalties/reverse/{penaltyId}", penalty.HandleReverse(db))
	workforceRead("GET /wlt/provider-penalties/by-incident/{incidentId}", penalty.HandleGetByIncident(db))
	workforceRead("GET /wlt/provider-penalties/{penaltyId}", penalty.HandleGetByID(db))

	read("GET /wlt/ledger/entries/{entryId}", ledger.HandleGetLedgerEntry(db))
	read("GET /wlt/ledger/entries", ledger.HandleListLedgerEntries(db))
	read("GET /wlt/ledger/financial-summary", ledger.HandleFinancialSummary(db))
	read("GET /wlt/internal/outbox-readback/loyalty", HandleLoyaltyOutboxReadback(db))

	mutation("PUT /wlt/payout-destinations/{actorType}/{actorId}", payout.HandleUpsertCanonicalPayoutDestination(db))
	read("GET /wlt/payout-destinations/{actorType}/{actorId}", payout.HandleGetCanonicalPayoutDestination(db))
	mutation("POST /wlt/payout-destinations/{actorType}/{actorId}/verify", payout.HandleVerifyCanonicalPayoutDestination(db))
	mutation("POST /wlt/payout-destinations/{actorType}/{actorId}/deactivate", payout.HandleDeactivateCanonicalPayoutDestination(db))

	read("GET /wlt/reconciliation-cases", reconciliation.HandleListCases(db))
	read("GET /wlt/reconciliation-cases/{caseId}", reconciliation.HandleGetCase(db))
	mutation("POST /wlt/reconciliation-cases/{caseId}/assign", reconciliation.HandleAssignCase(db))
	mutation("POST /wlt/reconciliation-cases/{caseId}/resolve", reconciliation.HandleResolveCase(db))

	mutation("POST /wlt/payout-requests", payout.HandleCreateGovernedPayoutRequest(db))
	read("GET /wlt/payout-requests", shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{Table: "wlt_payout_requests", ListPath: "/wlt/payout-requests"}, payout.HandleListPayoutRequests(db)))
	read("GET /wlt/payout-requests/{payoutId}", shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{Table: "wlt_payout_requests", IDPathValue: "payoutId"}, payout.HandleGetPayoutRequest(db)))
	read("GET /wlt/payout-requests/{payoutId}/audit", payout.HandleListPayoutAudit(db))
	mutation("POST /wlt/payout-requests/{payoutId}/approve", payout.HandleApprovePayoutRequestSovereign(db))
	mutation("POST /wlt/payout-requests/{payoutId}/reject", payout.HandleRejectPayoutRequestSovereign(db))
	mutation("POST /wlt/payout-requests/{payoutId}/reconcile", payout.HandleReconcilePayoutFourWay(db))
	mutation("POST /wlt/payout-requests/{payoutId}/complete", payout.HandleCompletePayoutRequestSovereign(db))
	mutation("PUT /wlt/external-provider-accounts/{providerKey}/{accountReferenceHash}", payout.HandleRegisterExternalProviderAccount(db))
	mutation("POST /wlt/external-provider-statements", payout.HandleImportAuthoritativeStatement(db))
	mutation("POST /wlt/payout-requests/{payoutId}/fail", payout.HandleFailPayoutRequestClosed())

	mutation("POST /wlt/internal/quotes/calculate", HandleCalculateQuote(db))
	read("GET /wlt/internal/quotes/checkout/{checkoutIntentId}", HandleGetCheckoutQuote(db))
	mutation("POST /wlt/internal/quotes/special-request", HandleIssueSpecialRequestQuote(db))
	read("GET /wlt/internal/quotes/special-request/{specialRequestId}", HandleGetActiveSpecialRequestQuote(db))

	read("GET /wlt/commercial/store-onboarding-fee", commercial.HandleGetStoreOnboardingFeePolicy(db))
	mutation("PUT /wlt/commercial/store-onboarding-fee", commercial.HandleUpsertStoreOnboardingFeePolicy(db))
	read("GET /wlt/commercial/summary", commercial.HandleGetSummary(db))
	read("GET /wlt/commercial/products/{productReference}", commercial.HandleGetProduct(db))
	mutation("POST /wlt/commercial/products", commercial.HandleCreateProduct(db))
	mutation("PATCH /wlt/commercial/products/{productReference}", commercial.HandleUpdateProductGoverned(db))
	mutation("POST /wlt/commercial/payment-sessions", commercial.HandleCreateSubscriptionPaymentSession(db))
	read("GET /wlt/commercial/clients/{clientId}/benefits", commercial.HandleGetClientBenefitsGoverned(db))
	mutation("POST /wlt/commercial/loyalty-entries", commercial.HandleAppendLoyaltyEntryGoverned(db))
	mutation("POST /wlt/commercial/subscriptions", commercial.HandleActivateSubscriptionLifecycle(db))
	read("GET /wlt/commercial/subscriptions/{subscriptionId}/lifecycle", commercial.HandleGetSubscriptionLifecycle(db))
	mutation("POST /wlt/commercial/subscriptions/{subscriptionId}/renew", commercial.HandleRenewSubscriptionLifecycle(db))
	mutation("POST /wlt/commercial/subscriptions/{subscriptionId}/cancel", commercial.HandleCancelSubscriptionLifecycle(db))
	mutation("POST /wlt/commercial/subscriptions/expire-due", commercial.HandleExpireDueSubscriptions(db))

	mutation("POST /wlt/promotion-funding/reservations", promotionfunding.HandleReserve(db))
	read("GET /wlt/promotion-funding/reservations/{reservationId}", promotionfunding.HandleGet(db))
	mutation("POST /wlt/promotion-funding/reservations/{reservationId}/commit", promotionfunding.HandleCommit(db))
	mutation("POST /wlt/promotion-funding/reservations/{reservationId}/release", promotionfunding.HandleRelease(db))
	mutation("POST /wlt/promotion-funding/reservations/{reservationId}/reverse", promotionfunding.HandleReverse(db))

	registerOrderCancellationRoutes(db, mutation)
	registerFieldCategoryCommissionRoutes(db, mutation)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "Route not found")
	})
	return mux, routes
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
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-ID, Idempotency-Key")
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

func requireWorkforceMutationServiceAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !shared.RequireServiceCaller(w, r, "WLT_WORKFORCE_SERVICE_TOKEN", "workforce") {
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
			shared.SendError(w, http.StatusForbidden, "MUTATIONS_DISABLED", "financial mutations are disabled on this instance")
		}
	}
}

func newKillSwitchGate(ds wallet.DecisionService) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if err := wallet.EnforceKillSwitch(r.Context(), ds, "finance_mutation", "service"); err != nil {
				shared.SendError(w, http.StatusForbidden, "KILL_SWITCH_ACTIVE", err.Error())
				return
			}
			next(w, r)
		}
	}
}
