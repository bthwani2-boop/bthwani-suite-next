package http

import (
	"net/http"

	"dsh-api/internal/partner"
)

// Readiness is partner-level plus every linked store. No route may reduce a
// multi-store partner to the first branch returned by the database.
func (s *protectedStoreServer) handleAggregatedPartnerReadiness(w http.ResponseWriter, r *http.Request) {
	s.servePartnerPermissionHandler(
		w,
		r,
		partner.HandleGetAggregatedReadiness(s.db),
		PartnersPermissionRead,
		"operator",
	)
}

func (s *protectedStoreServer) handleFieldAggregatedPartnerReadiness(w http.ResponseWriter, r *http.Request) {
	s.servePartnerHandler(w, r, partner.HandleFieldGetAggregatedReadiness(s.db), "field")
}

func (s *protectedStoreServer) handlePartnerAggregatedActivationReadiness(w http.ResponseWriter, r *http.Request) {
	s.servePartnerSelfHandler(w, r, partner.HandlePartnerMeAggregatedReadiness(s.db))
}
