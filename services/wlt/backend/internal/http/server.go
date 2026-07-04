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

func NewRouter(db *sql.DB) *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /wlt/health", health.HandleHealth)
	mux.HandleFunc("GET /wlt/readiness", health.HandleReadiness(db))

	mux.HandleFunc("GET /wlt/references/payment-status", reference.HandleGetPaymentStatus(db))
	mux.HandleFunc("GET /wlt/references/settlement-status", reference.HandleGetSettlementStatus(db))
	mux.HandleFunc("GET /wlt/references/refund-status", reference.HandleGetRefundStatus(db))
	mux.HandleFunc("GET /wlt/references/wallet-status", reference.HandleGetWalletStatus(db))
	mux.HandleFunc("POST /wlt/payment-sessions", reference.HandleCreatePaymentSession(db))
	mux.HandleFunc("GET /wlt/payment-sessions/{paymentSessionId}", reference.HandleGetPaymentSession(db))

	// WLT Payment Sessions: Payment Capture Lifecycle
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/authorize", payment.HandleAuthorizeSession(db))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/capture", payment.HandleCaptureSession(db))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/expire", payment.HandleExpireSession(db))
	mux.HandleFunc("POST /wlt/payment-sessions/{paymentSessionId}/cod-collect", payment.HandleMarkCodCollected(db))

	// WLT Refund Status: Refunds
	mux.HandleFunc("POST /wlt/refunds", refund.HandleCreateRefund(db))
	mux.HandleFunc("GET /wlt/refunds/{refundId}", refund.HandleGetRefund(db))
	mux.HandleFunc("GET /wlt/refunds", refund.HandleListRefunds(db))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/approve", refund.HandleApproveRefund(db))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/complete", refund.HandleCompleteRefund(db))
	mux.HandleFunc("POST /wlt/refunds/{refundId}/reject", refund.HandleRejectRefund(db))

	// WLT Settlement Status: Settlements
	mux.HandleFunc("GET /wlt/settlements/summary", settlement.HandleGetSettlementSummary(db))
	mux.HandleFunc("POST /wlt/settlements", settlement.HandleCreateSettlement(db))
	mux.HandleFunc("GET /wlt/settlements/{settlementId}", settlement.HandleGetSettlement(db))
	mux.HandleFunc("GET /wlt/settlements", settlement.HandleListSettlements(db))
	mux.HandleFunc("POST /wlt/settlements/{settlementId}/post", settlement.HandlePostSettlement(db))

	// WLT Commission: COD Commission
	mux.HandleFunc("POST /wlt/cod-records", cod.HandleCreateCodRecord(db))
	mux.HandleFunc("GET /wlt/cod-records/{codRecordId}", cod.HandleGetCodRecord(db))
	mux.HandleFunc("GET /wlt/cod-records", cod.HandleListCodRecords(db))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/collect", cod.HandleCollectCod(db))
	mux.HandleFunc("POST /wlt/cod-records/{codRecordId}/remit", cod.HandleRemitCod(db))
	mux.HandleFunc("POST /wlt/commissions", cod.HandleCreateCommission(db))
	mux.HandleFunc("GET /wlt/commissions", cod.HandleListCommissions(db))

	// WLT Ledger: Ledger Audit
	mux.HandleFunc("POST /wlt/ledger/entries", ledger.HandleAppendLedgerEntry(db))
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
