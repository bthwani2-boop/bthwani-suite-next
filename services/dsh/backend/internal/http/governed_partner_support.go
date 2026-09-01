package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"

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
		writePartnerSupportReadError(w, err)
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
		writePartnerSupportReadError(w, err)
		return
	}

	query := url.Values{}
	query.Set("partnerId", partnerID)
	status, body, err := s.protected.wlt.ExecuteFinanceRead(
		r.Context(), "finance.settlements.summary.read", nil, query,
		r.Header.Get("X-Correlation-ID"), agg.OperatorContextID,
	)
	if err != nil {
		writeSupportRequestError(w, err)
		return
	}
	if !json.Valid(body) {
		writeSupportRequestError(w, errors.New("WLT returned an invalid finance readback"))
		return
	}
	writeFinanceResponse(w, status, body, nil)
}

// GET /dsh/operator/support/partners/{partnerId}/operations
func (s *administrationSupportServer) handleGetPartnerSupportOperations(w http.ResponseWriter, r *http.Request) {
	partnerID := r.PathValue("partnerId")

	// Ensure the operator has a valid support session for THIS partner
	_, ok := s.requirePartnerSupportSession(w, r, partnerID)
	if !ok {
		return
	}

	operations, err := support.GetPartnerOperationsReadModel(s.db, partnerID)
	if err != nil {
		writePartnerSupportReadError(w, err)
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"operations": operations})
}

func writePartnerSupportReadError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, support.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "SUPPORT_REQUEST_INVALID", "partner support target is invalid")
	case errors.Is(err, support.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "PARTNER_NOT_FOUND", "partner support target was not found")
	default:
		writeSupportRequestError(w, err)
	}
}
