package reference

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/shared"
)

// HandleGetPaymentSessionByCheckoutIntentTrustedDsh resolves the single WLT
// payment session for a checkout intent inside the trusted OperatorContext.
// This is the readback used when a create response was lost before DSH stored
// the remote session id.
func HandleGetPaymentSessionByCheckoutIntentTrustedDsh(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, err := shared.RequireOperatorContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "MISSING_operator_context_id", "authenticated OperatorContext context is required")
			return
		}
		session, err := GetPaymentSessionByCheckoutIntentForOperatorContext(db, operatorContextID, r.PathValue("checkoutIntentId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}
