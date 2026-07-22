package http

import "net/http"

// registerJRN038CodFinanceRoutes composes the COD custody journey without
// expanding the already-contended root router. WLT remains the source of truth;
// these routes only enforce surface identity and proxy governed requests.
func registerJRN038CodFinanceRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("GET /dsh/partner/me/finance/cod-records", s.handlePartnerFinanceCodRecords)
	mux.HandleFunc("POST /dsh/partner/me/finance/cod-records/{recordId}/remit", s.handlePartnerRemitCod)
	mux.HandleFunc("GET /dsh/control-panel/finance/cod-reconciliation-cases", s.handleFinanceCodReconciliationCases)
	mux.HandleFunc("POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/assign", s.handleAssignFinanceCodReconciliationCase)
	mux.HandleFunc("POST /dsh/control-panel/finance/cod-reconciliation-cases/{caseId}/resolve", s.handleResolveFinanceCodReconciliationCase)
}
