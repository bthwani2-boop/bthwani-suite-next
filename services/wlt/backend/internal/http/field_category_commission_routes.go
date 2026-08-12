package http

import (
	"database/sql"

	"wlt-api/internal/cod"
)

// registerFieldCategoryCommissionRoutes keeps this extension in the shared
// financial route inventory. Policy changes remain DSH/operator initiated;
// commission creation is performed only by DSH's durable field-visit outbox
// worker.
func registerFieldCategoryCommissionRoutes(db *sql.DB, mutation routeRegistrar) {
	mutation("PUT /wlt/field-commission-category-policies/{partnerCategory}", cod.HandleUpsertFieldCategoryCommissionPolicy(db))
	mutation("POST /wlt/field-commissions", cod.HandleCreateFieldCategoryCommission(db))
}
