package payout

import (
	"database/sql"
	"net/http"
)

// HandleDeactivatePayoutDestinationGoverned preserves the legacy partner-only
// route while keeping its mutation gate and DSH service authentication in the
// WLT router. The actual state mutation remains centralized in the existing
// payout-destination handler; current surfaces use the typed JRN-037 routes.
func HandleDeactivatePayoutDestinationGoverned(db *sql.DB) http.HandlerFunc {
	return HandleDeactivatePayoutDestination(db)
}
