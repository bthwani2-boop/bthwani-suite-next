package http

import (
	"encoding/json"
	"net/http"

	"wlt-api/internal/pricing"
	"wlt-api/internal/shared"
)

func HandleCalculateQuote() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req pricing.CalculateQuoteRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid JSON payload")
			return
		}

		if req.ClientID == "" || req.StoreID == "" || req.Currency == "" || len(req.Lines) == 0 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "clientId, storeId, currency, and lines are required")
			return
		}

		quote, err := pricing.CalculateQuote(req)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CALCULATION_FAILED", err.Error())
			return
		}

		resp := pricing.PricingQuoteResponse{
			Quote: *quote,
		}

		shared.SendJSON(w, http.StatusOK, resp)
	}
}
