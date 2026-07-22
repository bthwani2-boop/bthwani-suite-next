package reference

import (
	"database/sql"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// HandleGetPaymentSessionTrustedDsh keeps WLT as the payment truth owner while
// requiring the trusted DSH caller to carry the tenant identity used when the
// session was created. A valid service token alone is not a cross-tenant read
// grant.
func HandleGetPaymentSessionTrustedDsh(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		trustedTenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if trustedTenantID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required")
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
		if session.TenantID != trustedTenantID {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentSession": session})
	}
}
