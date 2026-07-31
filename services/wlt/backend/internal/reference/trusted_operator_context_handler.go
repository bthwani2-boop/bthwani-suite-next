package reference

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// HandleCreatePaymentSessionTrustedDsh accepts payment-session creation only
// from authenticated DSH. Financial ownership is bound by WLT after service
// authentication; payload and transport scope selectors are ignored.
func HandleCreatePaymentSessionTrustedDsh(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !requireDshServiceCaller(w, r) {
			return
		}
		var input CreatePaymentSessionInput
		if !decodeJSON(w, r, &input) {
			return
		}
		if strings.TrimSpace(input.SubscriptionPurchaseID) != "" || strings.TrimSpace(input.CommercialProductReference) != "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_PAYMENT_SOURCE", "subscription purchases must use /wlt/commercial/payment-sessions")
			return
		}

		compatibilityScope, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusServiceUnavailable, "FINANCIAL_SCOPE_NOT_BOUND", "server-owned financial compatibility scope is unavailable")
			return
		}
		input.OperatorContextID = compatibilityScope
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		if input.IdempotencyKey == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key is required")
			return
		}
		if input.CorrelationID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_CORRELATION_ID", "X-Correlation-ID is required")
			return
		}
		session, err := CreatePaymentSession(db, input)
		if errors.Is(err, ErrIdempotencyConflict) {
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "payment source was already used with a different payload")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"paymentSession": session})
	}
}
