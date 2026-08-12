package http

import "net/http"

// registerPayoutFinanceRoutes binds DSH-owned authorization to WLT-owned payout
// truth. Beneficiary applications have no destination mutation routes. Finance
// creates/replaces candidates; destination verification/deactivation additionally
// requires the existing administration approval permission at the DSH boundary.
func registerPayoutFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/approve", s.withPermission("control-panel", FinancePermissionManage, s.handleApproveFinancePayoutRequest))
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/reject", s.withPermission("control-panel", FinancePermissionManage, s.handleRejectFinancePayoutRequest))
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-requests/{payoutId}/complete", s.withPermission("control-panel", FinancePermissionManage, s.handleCompleteFinancePayoutRequest))

	mux.HandleFunc("GET /dsh/control-panel/finance/payout-destinations/{actorType}/{actorId}", s.withPermission("control-panel", FinancePermissionRead, s.handleFinancePayoutDestinationRead))
	mux.HandleFunc("PUT /dsh/control-panel/finance/payout-destinations/{actorType}/{actorId}", s.withPermission("control-panel", FinancePermissionManage, s.handleFinancePayoutDestinationUpsert))

	verify := s.withPermission("control-panel", FinancePermissionManage, s.handleFinancePayoutDestinationVerify)
	verify = s.withPermission("control-panel", "administration.approve", verify)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-destinations/{actorType}/{actorId}/verify", verify)

	deactivate := s.withPermission("control-panel", FinancePermissionManage, s.handleFinancePayoutDestinationDeactivate)
	deactivate = s.withPermission("control-panel", "administration.approve", deactivate)
	mux.HandleFunc("POST /dsh/control-panel/finance/payout-destinations/{actorType}/{actorId}/deactivate", deactivate)
}
