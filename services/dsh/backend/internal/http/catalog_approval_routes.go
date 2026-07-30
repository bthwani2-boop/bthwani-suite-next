package http

import "net/http"

// registerCatalogApprovalRoutes binds PostgreSQL-backed catalog and media
// moderation readback. Partner projections are actor/store scoped; operator
// transitions and previews remain permission gated and preserve private media.
func registerCatalogApprovalRoutes(mux *http.ServeMux, s *protectedStoreServer) {
	mux.HandleFunc("POST /dsh/catalog-approvals", s.handleCreateCatalogApproval)
	mux.HandleFunc("GET /dsh/catalog-approvals", s.handleListCatalogApprovals)
	mux.HandleFunc("GET /dsh/partner/catalog-approvals", s.handleListPartnerCatalogApprovals)
	mux.HandleFunc("GET /dsh/partner/reels", s.handleListPartnerReels)
	mux.HandleFunc("POST /dsh/partner/reels", s.handleSubmitReelSafe)
	mux.HandleFunc("GET /dsh/operator/reels", s.handleListReels)
	mux.HandleFunc("POST /dsh/operator/reels/{reelId}/review", s.handleReviewReelSafe)
	mux.HandleFunc("GET /dsh/operator/reels/{reelId}/media/{kind}", s.handlePreviewOperatorReelMedia)
	mux.HandleFunc("PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}", s.handlePutProductProposalImageSafe)
	mux.HandleFunc("PUT /dsh/operator/catalog/stores/{storeId}/images/{role}", s.handlePutStoreImageSafe)
	mux.HandleFunc("GET /dsh/catalog-approvals/{recordId}", s.handleGetCatalogApproval)
	mux.HandleFunc("POST /dsh/catalog-approvals/{recordId}/transition", s.handleTransitionCatalogApproval)
}
