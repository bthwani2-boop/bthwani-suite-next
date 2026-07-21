package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/payment"
)

func RegisterOrderCancellationRoutes(mux *http.ServeMux, db *sql.DB, mutationsEnabled bool) {
	gate := newMutationGate(mutationsEnabled)
	serviceAuth := requireMutationServiceAuth
	mux.HandleFunc("POST /wlt/order-cancellations", gate(serviceAuth(payment.HandleGovernedOrderCancellation(db))))
}
