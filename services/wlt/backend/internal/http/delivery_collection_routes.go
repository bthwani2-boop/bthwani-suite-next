package http

import (
	"database/sql"

	"wlt-api/internal/cod"
)

// registerDeliveryCollectionRoutes exposes the fulfillment-neutral collection
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
func registerDeliveryCollectionRoutes(db *sql.DB, mutation, read routeRegistrar) {
	mutation("POST /wlt/delivery-collections", cod.HandleCreateDeliveryCollectionHandoff(db))
	read("GET /wlt/delivery-collections/{codRecordId}", cod.HandleGetDeliveryCollectionOperatorContext(db))
	read("GET /wlt/delivery-collections", cod.HandleListDeliveryCollectionsOperatorContext(db))
}
