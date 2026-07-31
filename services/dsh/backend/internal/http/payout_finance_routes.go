package http

import "net/http"

// registerPayoutFinanceRoutes binds DSH-owned authorization and payout state
// transition commands to WLT-owned financial truth. Payout audit and
// reconciliation remain registered once by the representative finance route
// group, which is the existing control-panel finance extension point.
func registerPayoutFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve", s.handleApproveFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject", s.handleRejectFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/process", s.handleProcessFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete", s.handleCompleteFinancePayoutRequest)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/fail", s.handleFailFinancePayoutRequest)
}
