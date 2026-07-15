package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
	"wlt-api/internal/health"
	"wlt-api/internal/ledger"
	"wlt-api/internal/payment"
	"wlt-api/internal/payout"
	"wlt-api/internal/reconciliation"
	"wlt-api/internal/reference"
	"wlt-api/internal/refund"
	"wlt-api/internal/settlement"
	"wlt-api/internal/shared"
	"wlt-api/internal/wallet"
)

// NewRouter builds the WLT HTTP router. mutationsEnabled gates every
// financial-mutation route (payment authorize/capture/expire/cod-collect,
// refunds, settlements, COD collect/remit, commissions, ledger entries,
// payout requests) behind WLT_MUTATIONS_ENABLED, and every such route also
// requires a valid DSH service-caller token (requireMutationServiceAuth) —
// the feature flag alone is not authentication. These journeys are not yet
// approved per service.manifest.ts (mutationRuntimeReady/
// mutationJourneysApproved are both false: this pass adds service-auth and
// tenant scoping, but the double-entry ledger kernel, maker-checker
// approval flow, and reconciliation are still pending), so the default is
// disabled: a misconfigured deployment fails closed, not open.
// Reference/read routes and the checkout payment-session handoff (an opaque
// reference only, never a fund movement) are never gated.
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
	
	// WLT Wallets: authentic financial view
	mux.HandleFunc("GET /wlt/wallets/{actorType}/{actorId}", readGate(wallet.HandleGetWallet(db)))
	mux.HandleFunc("POST /wlt/payment-sessions", reference.HandleCreatePaymentSession(db))
	mux.HandleFunc("GET /wlt/payment-sessions/{paymentSessionId}", reference.HandleGetPaymentSession(db))

	// WLT Payment Sessions: Payment Capture Lifecycle (financial mutation; gated
	// and service-authenticated -- WLT_MUTATIONS_ENABLED alone is not auth).
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/authorize", gate(serviceAuth(payment.HandleAuthorizeSession(db))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/capture", gate(serviceAuth(payment.HandleCaptureSession(db))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/expire", gate(serviceAuth(payment.HandleExpireSession(db))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cod-collect", gate(serviceAuth(payment.HandleMarkCodCollected(db))))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cancel-for-order", gate(serviceAuth(payment.HandleCancelSessionForOrder(db))))

	// WLT Refund Status: public references stay under /wlt/references/*; broad
	// financial read surfaces require service-level internal read auth, and
	// refund mutations require the same service-level auth.
	mux.HandleFunc("POST /wlt/refunds", gate(serviceAuth(refund.HandleCreateRefund(db))))
	mux.HandleFunc("GET /wlt/refunds/{refundId}", readGate(refund.HandleGetRefund(db)))
	mux.HandleFunc("GET /wlt/refunds", readGate(refund.HandleListRefunds(db)))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/approve", gate(serviceAuth(refund.HandleApproveRefund(db))))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/complete", gate(serviceAuth(refund.HandleCompleteRefund(db))))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/reject", gate(serviceAuth(refund.HandleRejectRefund(db))))

	// WLT Settlement Status: public status references stay under /wlt/references/*;
	// settlement financial ledgers require internal read auth, and settlement
	// mutations require the same service-level auth.
	mux.HandleFunc("GET /wlt/settlements/summary", readGate(settlement.HandleGetSettlementSummary(db)))
	mux.HandleFunc("POST /wlt/settlements", gate(serviceAuth(settlement.HandleCreateSettlement(db))))
	mux.HandleFunc("GET /wlt/settlements/{settlementId}", readGate(settlement.HandleGetSettlement(db)))
	mux.HandleFunc("GET /wlt/settlements", readGate(settlement.HandleListSettlements(db)))
	mux.HandleFunc("POST /wlt/settlements/{settlementId}/post", gate(serviceAuth(settlement.HandlePostSettlement(db))))

	// WLT Commission: COD records and commission reads expose financial data.
	// Creation already checks the DSH service caller inline (defense in depth);
	// all other COD/commission mutations are now also wrapped with the same
	// service-auth middleware here, in addition to the mutation gate.
	mux.HandleFunc("POST /wlt/cod-records", cod.HandleCreateCodRecord(db))
	mux.HandleFunc("GET /wlt/cod-records/{codRecordId}", readGate(cod.HandleGetCodRecord(db)))
	mux.HandleFunc("GET /wlt/cod-records", readGate(cod.HandleListCodRecords(db)))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/collect", gate(serviceAuth(cod.HandleCollectCod(db))))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/remit", gate(serviceAuth(cod.HandleRemitCod(db))))
	mux.HandleFunc("POST /wlt/commissions", gate(serviceAuth(cod.HandleCreateCommission(db))))
	mux.HandleFunc("GET /wlt/commissions", readGate(cod.HandleListCommissions(db)))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/confirm", gate(serviceAuth(cod.HandleConfirmCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/settle", gate(serviceAuth(cod.HandleSettleCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/reject", gate(serviceAuth(cod.HandleRejectCommission(db))))
	mux.HandleFunc("POST /wlt/commissions/{commissionId}/reverse", gate(serviceAuth(cod.HandleReverseCommission(db))))

	// WLT Ledger: all ledger surfaces are financial internals.
	mux.HandleFunc("POST /wlt/ledger/entries", gate(serviceAuth(ledger.HandleAppendLedgerEntry(db))))
	mux.HandleFunc("GET /wlt/ledger/entries/{entryId}", readGate(ledger.HandleGetLedgerEntry(db)))
	mux.HandleFunc("GET /wlt/ledger/entries", readGate(ledger.HandleListLedgerEntries(db)))

	// WLT Payout Destinations: DSH sends bank details here; WLT owns the
	// financial truth and returns only masked display values to DSH. The
	// upsert and deactivate routes mutate stored bank/IBAN/mobile-money data,
	// so (unlike the plain GET below) they must sit behind the mutation gate
	// like every other financial-mutation route, not just service-caller auth.
	mux.HandleFunc("PUT /wlt/payout-destinations/{partnerId}", gate(serviceAuth(payout.HandleUpsertPayoutDestination(db))))
	mux.HandleFunc("GET /wlt/payout-destinations/{partnerId}", readGate(payout.HandleGetPayoutDestination(db)))
	mux.HandleFunc("POST /wlt/payout-destinations/{partnerId}/deactivate", gate(serviceAuth(payout.HandleDeactivatePayoutDestination(db))))

	// WLT Reconciliation Cases: resolution surface for provider_result_unknown
	// sessions (wlt-015 added the open-case record only; this closes the
	// missing assign/resolve routes).
	mux.HandleFunc("GET /wlt/reconciliation-cases", readGate(reconciliation.HandleListCases(db)))
	mux.HandleFunc("GET /wlt/reconciliation-cases/{caseId}", readGate(reconciliation.HandleGetCase(db)))
	mux.HandleFunc("POST /wlt/reconciliation-cases/{caseId}/assign", gate(serviceAuth(reconciliation.HandleAssignCase(db))))
	mux.HandleFunc("POST /wlt/reconciliation-cases/{caseId}/resolve", gate(serviceAuth(reconciliation.HandleResolveCase(db))))

	// WLT Payout Requests
	mux.HandleFunc("POST /wlt/payout-requests", gate(serviceAuth(payout.HandleCreatePayoutRequest(db))))
	mux.HandleFunc("GET /wlt/payout-requests", readGate(payout.HandleListPayoutRequests(db)))
	mux.HandleFunc("GET /wlt/payout-requests/{payoutId}", readGate(payout.HandleGetPayoutRequest(db)))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/approve", gate(serviceAuth(payout.HandleApprovePayoutRequest(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/reject", gate(serviceAuth(payout.HandleRejectPayoutRequest(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/process", gate(serviceAuth(payout.HandleProcessPayoutRequest(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/complete", gate(serviceAuth(payout.HandleCompletePayoutRequest(db))))
	mux.HandleFunc("POST /wlt/payout-requests/{payoutId}/fail", gate(serviceAuth(payout.HandleFailPayoutRequest(db))))

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
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-ID, Idempotency-Key, X-Service-Caller")
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

// requireMutationServiceAuth wraps a financial-mutation handler so it can
// only be reached by the DSH service caller, using the same shared-secret
// mechanism as requireInternalFinancialRead. Before this, every mutation
// route below was reachable by anyone once WLT_MUTATIONS_ENABLED=true --
// the feature flag gated *whether* the journey was live, not *who* could
// call it. This closes that gap: newMutationGate and requireMutationServiceAuth
// are independent checks and both must pass.
func requireMutationServiceAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !shared.RequireServiceCaller(w, r, "WLT_DSH_SERVICE_TOKEN", "dsh") {
			return
		}
		next(w, r)
	}
}

// newMutationGate returns a wrapper that rejects gated financial-mutation
// handlers with 403 FEATURE_NOT_ENABLED unless mutationsEnabled is true.
func newMutationGate(mutationsEnabled bool) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		if mutationsEnabled {
			return next
		}
		return func(w http.ResponseWriter, r *http.Request) {
			shared.SendError(w, http.StatusForbidden, "FEATURE_NOT_ENABLED",
				"this financial mutation route is not enabled (WLT_MUTATIONS_ENABLED is not true)")
		}
	}
}
