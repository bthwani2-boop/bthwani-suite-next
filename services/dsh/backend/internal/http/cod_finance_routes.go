package http

import "net/http"

// registerCodFinanceRoutes binds surface-scoped DSH authorization to WLT-owned
// COD truth. The root finance router owns the control-panel list endpoint;
// this registrar adds actor self-service and governed mutation routes once.
func registerCodFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/partner/me/finance/cod-records", s.handlePartnerFinanceCodRecords)
	mux.HandleFunc("POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign", s.handleAssignFinanceCodReconciliationCase)
	mux.HandleFunc("POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve", s.handleResolveFinanceCodReconciliationCase)
}
