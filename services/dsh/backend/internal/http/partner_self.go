package http

import (
	"net/http"

	"dsh-api/internal/partner"
)

// handlePartnerActivationStatus lets an authenticated partner actor read their own status.
func (s *protectedStoreServer) handlePartnerActivationStatus(w http.ResponseWriter, r *http.Request) {
	s.servePartnerSelfHandler(w, r, partner.HandlePartnerMe(s.db))
}
