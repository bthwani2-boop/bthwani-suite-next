package refund

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/shared"
)

// RequireOperatorContextScope makes the authenticated OperatorContext stored in
// request context authoritative for every refund route. List reads receive an
// injected OperatorContext filter and all refund-id routes verify the stored
// owner before any read or mutation executes. Transport headers are consumed by
// service authentication and are not a domain authority here.
//
// This delegates to the generalized shared.RequireOperatorContextScope helper;
// its 404-on-mismatch and list-injection behavior remain canonical across
// settlement, cod, commission, payout and refund routes.
func RequireOperatorContextScope(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return shared.RequireOperatorContextScope(db, shared.OperatorContextScopeConfig{
		Table:       "wlt_refunds",
		IDPathValue: "refundId",
		ListPath:    "/wlt/refunds",
	}, next)
}
