package http

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"

	"wlt-api/internal/pricing"
	"wlt-api/internal/shared"
)

type specialRequestQuoteProposalBody struct {
	SpecialRequestID         string `json:"specialRequestId"`
	ClientID                 string `json:"clientId"`
	PolicyID                 string `json:"policyId"`
	ProposedAmountMinorUnits int64  `json:"proposedAmountMinorUnits"`
	ProposedCurrency         string `json:"proposedCurrency"`
	ProposalReason           string `json:"proposalReason"`
}

func HandleIssueSpecialRequestQuote(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial scope is unavailable")
			return
		}
		var body specialRequestQuoteProposalBody
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&body); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid special-request quote proposal")
			return
		}
		quote, replayed, err := pricing.IssueSpecialRequestQuote(r.Context(), db, operatorContextID, pricing.SpecialRequestQuoteProposal{
			SpecialRequestID: body.SpecialRequestID, ClientID: body.ClientID, PolicyID: body.PolicyID,
			ProposedAmountMinorUnits: body.ProposedAmountMinorUnits, ProposedCurrency: body.ProposedCurrency,
			ProposalReason: body.ProposalReason, IdempotencyKey: r.Header.Get("Idempotency-Key"), CorrelationID: r.Header.Get("X-Correlation-ID"),
		})
		if errors.Is(err, pricing.ErrSpecialRequestQuoteConflict) {
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "quote proposal idempotency key was already used with different evidence")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		status := http.StatusCreated
		if replayed {
			status = http.StatusOK
		}
		shared.SendJSON(w, status, map[string]any{"quote": quote})
	}
}

func HandleGetActiveSpecialRequestQuote(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial scope is unavailable")
			return
		}
		quote, err := pricing.LoadActiveSpecialRequestQuote(r.Context(), db, operatorContextID, r.PathValue("specialRequestId"))
		if errors.Is(err, pricing.ErrSpecialRequestQuoteNotFound) {
			shared.SendError(w, http.StatusNotFound, "QUOTE_NOT_FOUND", "active special-request quote does not exist")
			return
		}
		if errors.Is(err, pricing.ErrSpecialRequestQuoteExpired) {
			shared.SendError(w, http.StatusConflict, "QUOTE_EXPIRED", "active special-request quote has expired")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"quote": quote})
	}
}
