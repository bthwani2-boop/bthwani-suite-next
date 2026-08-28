package http

import "net/http"

// registerReconciliationFinanceRoutes exposes DSH authorization and routing only;
// WLT remains the sole owner of reconciliation and financial state transitions.
func registerReconciliationFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/assign", s.withPermission("control-panel", FinancePermissionManage, s.handleAssignFinanceReconciliationCase))
	mux.HandleFunc("POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve", s.withPermission("control-panel", FinancePermissionManage, s.handleResolveFinanceReconciliationCase))
}

func registerWltOutboxFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/wlt-outbox-events/{eventId}/retry", s.withPermission("control-panel", FinancePermissionManage, s.handleRetryWltDeliveryEvent))
}
