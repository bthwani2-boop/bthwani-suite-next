package payment

import (
	"database/sql"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// HandleTenantScopedPaymentSession prevents a valid internal service token from
// becoming an implicit cross-tenant financial grant. It is used for terminal
// session mutations whose handler already owns its own idempotency semantics.
func HandleTenantScopedPaymentSession(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		trustedOperatorContextID := strings.TrimSpace(r.Header.Get("X-Operator-Context-ID"))
		if trustedOperatorContextID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Operator-Context-ID is required")
			return
		}
		session, err := getSession(db, strings.TrimSpace(r.PathValue("paymentSessionId")))
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PAYMENT_SESSION_READ_FAILED", "failed to read payment session")
			return
		}
		if session == nil || session.OperatorContextID != trustedOperatorContextID {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		next(w, r)
	}
}
