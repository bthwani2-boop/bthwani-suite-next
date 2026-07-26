package refund

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/shared"
)

// RequireTenantScope makes the trusted DSH tenant header authoritative for
// every refund route. Creation still validates the request body against this
// header; list reads receive an injected tenant filter; all refund-id routes
// verify the stored owner before any read or mutation executes.
//
// This delegates to the generalized shared.RequireTenantScope helper; the
// 404-on-mismatch and list-injection behavior are unchanged from before this
// was generalized for settlement/cod/commission/payout routes.
func RequireTenantScope(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return shared.RequireTenantScope(db, shared.TenantScopeConfig{
		Table:       "wlt_refunds",
		IDPathValue: "refundId",
		ListPath:    "/wlt/refunds",
	}, next)
}
