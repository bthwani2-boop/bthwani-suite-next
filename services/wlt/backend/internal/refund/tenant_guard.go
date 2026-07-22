package refund

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// RequireTenantScope makes the trusted DSH tenant header authoritative for
// every refund route. Creation still validates the request body against this
// header; list reads receive an injected tenant filter; all refund-id routes
// verify the stored owner before any read or mutation executes.
func RequireTenantScope(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if tenantID == "" {
			shared.SendError(w, http.StatusBadRequest, "TENANT_REQUIRED", "trusted refund tenant is required")
			return
		}

		refundID := strings.TrimSpace(r.PathValue("refundId"))
		if refundID != "" {
			var storedTenant string
			if err := db.QueryRowContext(r.Context(), `SELECT tenant_id FROM wlt_refunds WHERE id=$1`, refundID).Scan(&storedTenant); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
					return
				}
				shared.SendError(w, http.StatusInternalServerError, "REFUND_TENANT_LOOKUP_FAILED", "refund tenant could not be verified")
				return
			}
			if storedTenant != tenantID {
				// Deliberately return not found so tenant boundaries do not become
				// an identifier-enumeration oracle.
				shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
				return
			}
		}

		if r.Method == http.MethodGet && r.URL.Path == "/wlt/refunds" {
			query := r.URL.Query()
			if requestedTenant := strings.TrimSpace(query.Get("tenantId")); requestedTenant != "" && requestedTenant != tenantID {
				shared.SendError(w, http.StatusForbidden, "TENANT_MISMATCH", "refund tenant filter does not match trusted DSH tenant")
				return
			}
			query.Set("tenantId", tenantID)
			r.URL.RawQuery = query.Encode()
		}

		next(w, r)
	}
}
