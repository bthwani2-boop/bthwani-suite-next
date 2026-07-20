package orders

import "database/sql"

// ListClientOrdersHydrated returns the same actor/tenant-scoped order list as
// ListClientOrders while attaching the immutable order-item snapshots required
// by the client history UI. It never reads current catalog prices or names.
func ListClientOrdersHydrated(db *sql.DB, tenantID, clientID string, limit int) ([]Order, error) {
	orders, err := ListClientOrders(db, tenantID, clientID, limit)
	if err != nil {
		return nil, err
	}
	for index := range orders {
		items, itemErr := listOrderItems(db, orders[index].ID)
		if itemErr != nil {
			return nil, itemErr
		}
		orders[index].Items = items
	}
	return orders, nil
}
