package http

import (
	"database/sql"

	"wlt-api/internal/payment"
)

func registerOrderCancellationRoutes(db *sql.DB, mutation routeRegistrar) {
	mutation("POST /wlt/order-cancellations", payment.HandleGovernedOrderCancellation(db))
}
