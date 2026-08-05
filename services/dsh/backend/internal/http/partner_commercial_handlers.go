package http

import (
	"context"
	"encoding/json"
	"net/http"

	"dsh-api/internal/auth"
)

type commercialSummaryResponse struct {
	Model         string `json:"model"`
	EffectiveFrom string `json:"effectiveFrom"`
}

func (s *protectedStoreServer) handlePartnerCommercialSummary(w http.ResponseWriter, r *http.Request, identity auth.Identity) {
	storeId := r.PathValue("storeId")
	if storeId == "" {
		sendError(w, http.StatusBadRequest, "INVALID_STORE", "storeId is required")
		return
	}

	partnerId, ok := s.getPartnerIdForStore(r.Context(), storeId)
	if !ok {
		sendError(w, http.StatusForbidden, "FORBIDDEN", "not authorized for this store")
		return
	}

	// Fetch from platform client
	variable, err := s.platformClient.GetVariable(r.Context(), "VAR_PARTNER_COMMERCIAL_MODEL", "partner", partnerId)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "PLATFORM_CLIENT_ERROR", "failed to fetch commercial model from platform")
		return
	}

	if variable == nil {
		sendJSON(w, http.StatusOK, commercialSummaryResponse{
			Model:         "UNKNOWN",
			EffectiveFrom: "",
		})
		return
	}

	var modelValue string
	if strVal, ok := variable.ValueJSON.(string); ok {
		modelValue = strVal
	} else {
		modelValue = "UNKNOWN"
	}

	sendJSON(w, http.StatusOK, commercialSummaryResponse{
		Model:         modelValue,
		EffectiveFrom: variable.EffectiveFrom,
	})
}

// Helper to get partner ID from store
func (s *protectedStoreServer) getPartnerIdForStore(ctx context.Context, storeId string) (string, bool) {
	var partnerId string
	err := s.db.QueryRowContext(ctx, "SELECT partner_id FROM dsh_stores WHERE id = $1", storeId).Scan(&partnerId)
	if err != nil {
		return "", false
	}
	return partnerId, true
}
