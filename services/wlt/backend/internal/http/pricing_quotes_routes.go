package http

import (
	"encoding/json"
	"net/http"

	"wlt-api/internal/pricing"
	"wlt-api/internal/shared"
)

// HandleCalculateQuote serves POST /wlt/internal/quotes/calculate. DSH supplies
// operational inputs and consumes the returned quote as-is; every bound and
// every money figure is decided by pricing.CalculateQuote, which is the only
// authority for cart money. The handler therefore validates shape, not amounts:
// duplicating the amount rules here would create a second, drifting authority.
func HandleCalculateQuote() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req pricing.CalculateQuoteRequest
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&req); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid quote request payload")
			return
		}

		quote, err := pricing.CalculateQuote(req)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CALCULATION_FAILED", err.Error())
			return
		}

		shared.SendJSON(w, http.StatusOK, pricing.PricingQuoteResponse{Quote: *quote})
	}
}
