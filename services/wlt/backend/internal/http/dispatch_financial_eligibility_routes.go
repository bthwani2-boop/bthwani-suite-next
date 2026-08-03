package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/dispatchfinancialeligibility"
)

// RegisterDispatchFinancialEligibilityRoutes exposes the WLT-owned internal
// decision boundary. It is authenticated as a DSH service call but is not
// coupled to the financial-mutation feature flag because evaluating and
// recording a short-lived decision does not mutate wallet or ledger truth.
func RegisterDispatchFinancialEligibilityRoutes(mux *http.ServeMux, db *sql.DB) {
	mux.HandleFunc(
		"POST /internal/dispatch-financial-eligibility/evaluate",
		requireMutationServiceAuth(dispatchfinancialeligibility.HandleEvaluate(db)),
	)
}
