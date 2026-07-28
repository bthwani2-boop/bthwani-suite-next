package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
)

// RegisterDeliveryCollectionRoutes exposes the fulfillment-neutral collection
// surface. Legacy /wlt/cod-records remains available for captain-only clients,
// but every live mutation and read is bound to the authenticated tenant.
func RegisterDeliveryCollectionRoutes(mux *http.ServeMux, db *sql.DB, mutationsEnabled bool) {
	gate := newMutationGate(mutationsEnabled)
	readGate := requireInternalFinancialRead
	serviceAuth := requireMutationServiceAuth

	mux.HandleFunc("POST /wlt/delivery-collections", gate(serviceAuth(cod.HandleCreateDeliveryCollectionHandoff(db))))
	mux.HandleFunc("GET /wlt/delivery-collections/{codRecordId}", readGate(cod.HandleGetDeliveryCollectionTenant(db)))
	mux.HandleFunc("GET /wlt/delivery-collections", readGate(cod.HandleListDeliveryCollectionsTenant(db)))
	mux.HandleFunc("POST /wlt/delivery-collections/{codRecordId}/collect", gate(serviceAuth(cod.HandleCollectCodSovereign(db))))
	mux.HandleFunc("POST /wlt/delivery-collections/{codRecordId}/remit", gate(serviceAuth(cod.HandleRemitCodSovereign(db))))
}
