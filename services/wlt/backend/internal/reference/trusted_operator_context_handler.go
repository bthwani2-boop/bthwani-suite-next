package reference

import (
	"database/sql"
	"net/http"
)

// HandleCreatePaymentSessionTrustedDsh accepts payment-session creation only
// from authenticated DSH. Financial ownership is bound by WLT after service
// authentication; payload and transport scope selectors are ignored.
func HandleCreatePaymentSessionTrustedDsh(db *sql.DB) http.HandlerFunc {
	return handleCreatePaymentSession(db, validateTrustedPaymentSessionInput)
}
