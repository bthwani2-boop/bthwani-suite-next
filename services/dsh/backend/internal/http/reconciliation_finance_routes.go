package http

import "net/http"

// registerReconciliationFinanceRoutes exposes DSH authorization and routing only;
// WLT remains the sole owner of reconciliation and financial state transitions.
func registerReconciliationFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/assign", s.handleAssignFinanceReconciliationCase)
	mux.HandleFunc("POST /dsh/control-panel/finance/reconciliation-cases/{caseId}/resolve", s.handleResolveFinanceReconciliationCase)
}
