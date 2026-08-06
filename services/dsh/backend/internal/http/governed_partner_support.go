package http

import (
	"net/http"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

// GET /dsh/operator/support/partners/{partnerId}/aggregate
func (s *administrationSupportServer) handleGetPartnerSupportAggregate(w http.ResponseWriter, r *http.Request) {
	partnerID := r.PathValue("partnerId")
	
	// Ensure the operator has a valid support session for THIS partner
	_, ok := s.requirePartnerSupportSession(w, r, partnerID)
	if !ok {
		return
	}

	agg, err := support.GetPartnerAggregate(s.db, partnerID)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"aggregate": agg})
}

// GET /dsh/operator/support/partners/{partnerId}/finance
func (s *administrationSupportServer) handleGetPartnerSupportFinance(w http.ResponseWriter, r *http.Request) {
	partnerID := r.PathValue("partnerId")
	
	// Ensure the operator has a valid support session for THIS partner
	_, ok := s.requirePartnerSupportSession(w, r, partnerID)
	if !ok {
		return
	}

	// We need operatorContextID for WLT references
	agg, err := support.GetPartnerAggregate(s.db, partnerID)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}

	financeAgg, err := support.GetMaskedPartnerFinance(r.Context(), s.protected.wlt, agg.OperatorContextID)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"finance": financeAgg})
}

// GET /dsh/operator/support/partners/{partnerId}/operations
func (s *administrationSupportServer) handleGetPartnerSupportOperations(w http.ResponseWriter, r *http.Request) {
	partnerID := r.PathValue("partnerId")
	
	// Ensure the operator has a valid support session for THIS partner
	_, ok := s.requirePartnerSupportSession(w, r, partnerID)
	if !ok {
		return
	}

	agg, err := support.GetPartnerAggregate(s.db, partnerID)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}

	// Fetch a scoped, read-only operational view for this partner.
	// For J074, we simply return a stub that points to the finance and support tickets,
	// preventing operators from directly mutating the order state here.
	operations := map[string]any{
		"operatorContextId": agg.OperatorContextID,
		"status":            "scoped_read_only",
		"message":           "Operational mutations must occur through the explicit Order lifecycle routes, not the support facade.",
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"operations": operations})
}
