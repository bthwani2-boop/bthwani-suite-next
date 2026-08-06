package http

import (
	"net/http"

	"dsh-api/internal/partner"
)

func (s *protectedStoreServer) handleReviewPartnerDocumentSeparated(w http.ResponseWriter, r *http.Request) {
	handler := partner.EnforcePartnerDocumentReviewSeparation(
		s.db,
		s.handleReviewPartnerDocument,
	)
	handler(w, r)
}
