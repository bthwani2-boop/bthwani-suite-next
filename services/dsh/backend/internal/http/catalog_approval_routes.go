package http

import "net/http"

// registerCatalogApprovalRoutes binds the PostgreSQL-backed approval queue.
// The partner projection is read-only; operator transitions remain permission gated
// by the handlers and preserve the append-only audit trail.
func registerCatalogApprovalRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/catalog-approvals", s.handleCreateCatalogApproval)
	mux.HandleFunc("GET /dsh/catalog-approvals", s.handleListCatalogApprovals)
	mux.HandleFunc("GET /dsh/partner/catalog-approvals", s.handleListPartnerCatalogApprovals)
	mux.HandleFunc("GET /dsh/catalog-approvals/{recordId}", s.handleGetCatalogApproval)
	mux.HandleFunc("POST /dsh/catalog-approvals/{recordId}/transition", s.handleTransitionCatalogApproval)
}
