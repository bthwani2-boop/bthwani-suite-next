package http

import "net/http"

// registerPayoutFinanceRoutes binds DSH-owned authorization and request handling
// to WLT-owned payout truth. Each operation is registered exactly once.
func registerPayoutFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve", s.handleApproveFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject", s.handleRejectFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/process", s.handleProcessFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete", s.handleCompleteFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/fail", s.handleFailFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/reconcile", s.handleReconcileFinancePayoutRequest)
	mux.HandleFunc("GET /dsh/control-panel/finance/payout-requests/{payoutId}/audit", s.handleFinancePayoutAudit)
}
