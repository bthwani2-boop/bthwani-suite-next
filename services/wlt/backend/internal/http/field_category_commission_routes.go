package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
)

// RegisterFieldCategoryCommissionRoutes keeps the category extension outside
// the broad legacy router while reusing the same mutation and service-auth
// gates. Policy changes remain DSH/operator initiated; commission creation is
// performed only by DSH's durable field-visit outbox worker.
func RegisterFieldCategoryCommissionRoutes(mux *http.ServeMux, db *sql.DB, mutationsEnabled bool) {
	gate := newMutationGate(mutationsEnabled)
	serviceAuth := requireMutationServiceAuth
	mux.HandleFunc("PUT /wlt/field-commission-category-policies/{partnerCategory}", gate(serviceAuth(cod.HandleUpsertFieldCategoryCommissionPolicy(db))))
	mux.HandleFunc("POST /wlt/field-commissions", gate(serviceAuth(cod.HandleCreateFieldCategoryCommission(db))))
}
