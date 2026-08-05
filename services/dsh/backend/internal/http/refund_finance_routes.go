package http

import "net/http"

// registerRefundFinanceRoutes is the single composition point for governed DSH
// financial mutation registrars. WLT remains the sole owner of financial truth;
// DSH enforces actor, OperatorContext and privacy boundaries before proxying.
func registerRefundFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds", s.withPermission("control-panel", FinancePermissionManage, s.handleCreateFinanceRefund))
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/approve", s.withPermission("control-panel", FinancePermissionManage, s.handleApproveFinanceRefund))
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/reject", s.withPermission("control-panel", FinancePermissionManage, s.handleRejectFinanceRefund))
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/complete", s.withPermission("control-panel", FinancePermissionManage, s.handleCompleteFinanceRefund))
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/reconcile", s.withPermission("control-panel", FinancePermissionManage, s.handleReconcileFinanceRefund))
	mux.HandleFunc("GET /dsh/control-panel/finance/refunds/{refundId}/audit", s.withPermission("control-panel", FinancePermissionRead, s.handleFinanceRefundAudit))
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/refunds", s.handleClientOrderRefunds)
	mux.HandleFunc("GET /dsh/partner/orders/{orderId}/refunds", s.handlePartnerOrderRefunds)

	registerPayoutFinanceRoutes(mux, s)
	registerReconciliationFinanceRoutes(mux, s)
	registerCodFinanceRoutes(mux, s)
}