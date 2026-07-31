package reference

import (
	"database/sql"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// HandleGetPaymentSessionTrustedDsh keeps WLT as the payment truth owner while
// requiring the trusted DSH caller to carry the OperatorContext identity used when the
// session was created. A valid service token alone is not a cross-OperatorContext read
// grant.
func HandleGetPaymentSessionTrustedDsh(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		trustedOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if trustedOperatorContextID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_operator_context_id", "X-Operator-Context-ID is required")
			return
		}
		session, err := GetPaymentSession(db, r.PathValue("paymentSessionId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if session == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		if session.OperatorContextID != trustedOperatorContextID {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}
