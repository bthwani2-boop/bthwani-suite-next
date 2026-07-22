package http

import "net/http"

// registerRefundFinanceRoutes keeps JRN-035 bindings in one bounded registrar.
// WLT remains the financial owner; these routes enforce DSH actor, tenant and
// privacy boundaries before proxying canonical commands or reads.
func registerRefundFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds", s.handleCreateFinanceRefund)
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/approve", s.handleApproveFinanceRefund)
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/reject", s.handleRejectFinanceRefund)
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/complete", s.handleCompleteFinanceRefund)
	mux.HandleFunc("POST /dsh/control-panel/finance/refunds/{refundId}/reconcile", s.handleReconcileFinanceRefund)
	mux.HandleFunc("GET /dsh/control-panel/finance/refunds/{refundId}/audit", s.handleFinanceRefundAudit)
	mux.HandleFunc("GET /dsh/client/orders/{orderId}/refunds", s.handleClientOrderRefunds)
	mux.HandleFunc("GET /dsh/partner/orders/{orderId}/refunds", s.handlePartnerOrderRefunds)
}
