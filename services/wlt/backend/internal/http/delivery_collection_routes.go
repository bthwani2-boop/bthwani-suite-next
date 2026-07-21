package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
)

// RegisterDeliveryCollectionRoutes exposes the fulfillment-neutral collection
// surface. Legacy /wlt/cod-records remains available for captain-only clients.
func RegisterDeliveryCollectionRoutes(mux *http.ServeMux, db *sql.DB, mutationsEnabled bool) {
	gate := newMutationGate(mutationsEnabled)
	readGate := requireInternalFinancialRead
	serviceAuth := requireMutationServiceAuth

	mux.HandleFunc("POST /wlt/delivery-collections", gate(serviceAuth(cod.HandleCreateDeliveryCollectionHandoff(db))))
	mux.HandleFunc("GET /wlt/delivery-collections/{codRecordId}", readGate(cod.HandleGetDeliveryCollection(db)))
	mux.HandleFunc("GET /wlt/delivery-collections", readGate(cod.HandleListDeliveryCollections(db)))
	mux.HandleFunc("POST /wlt/delivery-collections/{codRecordId}/collect", gate(serviceAuth(cod.HandleCollectDeliveryCollection(db))))
	mux.HandleFunc("POST /wlt/delivery-collections/{codRecordId}/remit", gate(serviceAuth(cod.HandleRemitDeliveryCollection(db))))
}
