package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
	"wlt-api/internal/health"
	"wlt-api/internal/ledger"
	"wlt-api/internal/payment"
	"wlt-api/internal/reference"
	"wlt-api/internal/refund"
	"wlt-api/internal/settlement"
	"wlt-api/internal/shared"
)

// NewRouter builds the WLT HTTP router. mutationsEnabled gates every
// financial-mutation route (payment authorize/capture/expire/cod-collect,
// refunds, settlements, ledger entries) behind WLT_MUTATIONS_ENABLED. These
// journeys are not yet approved per service.manifest.ts
// (mutationRuntimeReady/mutationJourneysApproved are both false), so the
// default is disabled: a misconfigured deployment fails closed, not open.
// Reference/read routes and the checkout payment-session handoff (an opaque
// reference only, never a fund movement) are never gated.
func NewRouter(db *sql.DB, mutationsEnabled bool) *http.ServeMux {
	mux := http.NewServeMux()
	gate := newMutationGate(mutationsEnabled)

	mux.HandleFunc("GET /wlt/health", health.HandleHealth)
	mux.HandleFunc("GET /wlt/readiness", health.HandleReadiness(db))

	mux.HandleFunc("GET /wlt/references/payment-status", reference.HandleGetPaymentStatus(db))
	mux.HandleFunc("GET /wlt/references/settlement-status", reference.HandleGetSettlementStatus(db))
	mux.HandleFunc("GET /wlt/references/refund-status", reference.HandleGetRefundStatus(db))
	mux.HandleFunc("GET /wlt/references/wallet-status", reference.HandleGetWalletStatus(db))
	mux.HandleFunc("POST /wlt/payment-sessions", reference.HandleCreatePaymentSession(db))
	mux.HandleFunc("GET /wlt/payment-sessions/{paymentSessionId}", reference.HandleGetPaymentSession(db))

	// WLT Payment Sessions: Payment Capture Lifecycle (financial mutation; gated)
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/authorize", gate(payment.HandleAuthorizeSession(db)))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/capture", gate(payment.HandleCaptureSession(db)))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/expire", gate(payment.HandleExpireSession(db)))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cod-collect", gate(payment.HandleMarkCodCollected(db)))

	// WLT Refund Status: Refunds (financial mutation; gated)
	mux.HandleFunc("POST /wlt/refunds", gate(refund.HandleCreateRefund(db)))
	mux.HandleFunc("GET /wlt/refunds/{refundId}", refund.HandleGetRefund(db))
	mux.HandleFunc("GET /wlt/refunds", refund.HandleListRefunds(db))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/approve", gate(refund.HandleApproveRefund(db)))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/complete", gate(refund.HandleCompleteRefund(db)))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/reject", gate(refund.HandleRejectRefund(db)))

	// WLT Settlement Status: Settlements (financial mutation; gated)
	mux.HandleFunc("GET /wlt/settlements/summary", settlement.HandleGetSettlementSummary(db))
	mux.HandleFunc("POST /wlt/settlements", gate(settlement.HandleCreateSettlement(db)))
	mux.HandleFunc("GET /wlt/settlements/{settlementId}", settlement.HandleGetSettlement(db))
	mux.HandleFunc("GET /wlt/settlements", settlement.HandleListSettlements(db))
	mux.HandleFunc("POST /wlt/settlements/{settlementId}/post", gate(settlement.HandlePostSettlement(db)))

	// WLT Commission: COD Commission (create is DSH-only service-to-service;
	// collect/remit are ops mutations and stay gated until approved)
	mux.HandleFunc("POST /wlt/cod-records", cod.HandleCreateCodRecord(db))
	mux.HandleFunc("GET /wlt/cod-records/{codRecordId}", cod.HandleGetCodRecord(db))
	mux.HandleFunc("GET /wlt/cod-records", cod.HandleListCodRecords(db))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/collect", gate(cod.HandleCollectCod(db)))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/remit", gate(cod.HandleRemitCod(db)))
	mux.HandleFunc("POST /wlt/commissions", cod.HandleCreateCommission(db))
	mux.HandleFunc("GET /wlt/commissions", cod.HandleListCommissions(db))

	// WLT Ledger: Ledger Audit (financial mutation; gated)
	mux.HandleFunc("POST /wlt/ledger/entries", gate(ledger.HandleAppendLedgerEntry(db)))
	mux.HandleFunc("GET /wlt/ledger/entries/{entryId}", ledger.HandleGetLedgerEntry(db))
	mux.HandleFunc("GET /wlt/ledger/entries", ledger.HandleListLedgerEntries(db))

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
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
