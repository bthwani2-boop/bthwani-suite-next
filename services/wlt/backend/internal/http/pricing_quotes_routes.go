package http

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"wlt-api/internal/pricing"
	"wlt-api/internal/shared"
)

// HandleCalculateQuote serves POST /wlt/internal/quotes/calculate. DSH supplies
// operational inputs and consumes the returned quote as-is; every bound and
// every money figure is decided by pricing.CalculateQuote, which is the only
// authority for cart money. The handler therefore validates shape, not amounts:
// duplicating the amount rules here would create a second, drifting authority.
func HandleCalculateQuote(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req pricing.CalculateQuoteRequest
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&req); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid quote request payload")
			return
		}

		if req.CheckoutIntentID == "" {
			quote, err := pricing.CalculateQuote(req)
			if err != nil {
				shared.SendError(w, http.StatusBadRequest, "CALCULATION_FAILED", err.Error())
				return
			}
			shared.SendJSON(w, http.StatusOK, pricing.PricingQuoteResponse{Quote: *quote})
			return
		}
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial compatibility scope is unavailable")
			return
		}
		issued, err := pricing.IssueCheckoutQuote(r.Context(), db, operatorContextID, req)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CALCULATION_FAILED", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, pricing.PricingQuoteResponse{Quote: issued.WltPricingQuote})
	}
}

func HandleGetCheckoutQuote(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial compatibility scope is unavailable")
			return
		}
		quote, err := pricing.LoadCheckoutQuoteByIntent(r.Context(), db, operatorContextID, r.PathValue("checkoutIntentId"))
		if errors.Is(err, pricing.ErrCheckoutQuoteNotFound) {
			shared.SendError(w, http.StatusNotFound, "PRICING_QUOTE_NOT_FOUND", "canonical checkout pricing quote does not exist")
			return
		}
		if errors.Is(err, pricing.ErrCheckoutQuoteExpired) {
			shared.SendError(w, http.StatusConflict, "PRICING_QUOTE_EXPIRED", "canonical checkout pricing quote has expired")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PRICING_QUOTE_READ_FAILED", "failed to read canonical checkout pricing quote")
			return
		}
		shared.SendJSON(w, http.StatusOK, pricing.PricingQuoteResponse{Quote: quote.WltPricingQuote})
	}
}
