package http

import (
	"database/sql"
	"net/http"

	"wlt-api/internal/cod"
)

// RegisterDeliveryCollectionRoutes exposes the fulfillment-neutral collection
// surface. Legacy /wlt/cod-records remains available for captain-only clients,
// but every live mutation and read is bound to the authenticated OperatorContext.
//
// collect/remit are intentionally NOT duplicated here (C3 remediation): they
// used to bind to the exact same handlers (HandleCollectCodSovereign /
// HandleRemitCodSovereign) as /wlt/cod-records/{codRecordId}/collect|remit,
// giving the same money-moving mutation two documented URLs with zero actual
// consumers of the delivery-collections variant (verified against DSH backend
// and every frontend surface). /wlt/cod-records/{codRecordId}/collect|remit
// remains the single canonical path for that mutation.
func RegisterDeliveryCollectionRoutes(mux *http.ServeMux, db *sql.DB, mutationsEnabled bool) {
	gate := newMutationGate(mutationsEnabled)
	readGate := requireInternalFinancialRead
	serviceAuth := requireMutationServiceAuth

	mux.HandleFunc("POST /wlt/delivery-collections", gate(serviceAuth(cod.HandleCreateDeliveryCollectionHandoff(db))))
	mux.HandleFunc("GET /wlt/delivery-collections/{codRecordId}", readGate(cod.HandleGetDeliveryCollectionOperatorContext(db)))
	mux.HandleFunc("GET /wlt/delivery-collections", readGate(cod.HandleListDeliveryCollectionsOperatorContext(db)))
}
