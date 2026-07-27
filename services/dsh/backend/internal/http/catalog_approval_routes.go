package http

import "net/http"

// registerCatalogApprovalRoutes binds PostgreSQL-backed catalog and media
// moderation readback. Partner projections are actor/store scoped; operator
// transitions remain permission gated and preserve append-only audit truth.
func registerCatalogApprovalRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/catalog-approvals", s.handleCreateCatalogApproval)
	mux.HandleFunc("GET /dsh/catalog-approvals", s.handleListCatalogApprovals)
	mux.HandleFunc("GET /dsh/partner/catalog-approvals", s.handleListPartnerCatalogApprovals)
	mux.HandleFunc("GET /dsh/partner/reels", s.handleListPartnerReels)
	mux.HandleFunc("GET /dsh/catalog-approvals/{recordId}", s.handleGetCatalogApproval)
	mux.HandleFunc("POST /dsh/catalog-approvals/{recordId}/transition", s.handleTransitionCatalogApproval)
}
