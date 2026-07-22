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
		trustedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if trustedTenantID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required")
			return
		}
		session, err := getSession(db, strings.TrimSpace(r.PathValue("paymentSessionId")))
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PAYMENT_SESSION_READ_FAILED", "failed to read payment session")
			return
		}
		if session == nil || session.TenantID != trustedTenantID {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		next(w, r)
	}
}
