package http

import (
	"net/http"

	"dsh-api/internal/partner"
)

func (s *protectedStoreServer) handleReviewPartnerDocumentSeparated(w http.ResponseWriter, r *http.Request) {
	handler := partner.EnforcePartnerDocumentReviewSeparation(
		s.db,
		partner.HandleReviewDocument(s.db),
	)
	s.servePartnerPermissionHandler(w, r, handler, PartnersPermissionManage)
}
