package cart

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
)

// HydrateOperatorCartItems returns the actual persisted cart lines used by the
// control-panel operational view. The operator surface is read-only and never
// computes financial truth; it reads the same DSH price snapshots as the client.
func HydrateOperatorCartItems(ctx context.Context, db *sql.DB, carts []Cart) ([]Cart, error) {
	if len(carts) == 0 {
		return []Cart{}, nil
	}

	cartIDs := make([]string, 0, len(carts))
	for _, current := range carts {
		cartIDs = append(cartIDs, current.ID)
	}

	rows, err := db.QueryContext(ctx, `
		SELECT id, cart_id, product_id, master_product_id, store_assortment_id,
		       product_name, price_reference, unit_price_minor, currency, quantity, version,
		       created_at, updated_at
		FROM dsh_cart_items
		WHERE cart_id = ANY($1)
		ORDER BY cart_id, created_at`, pq.Array(cartIDs),
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	itemsByCartID := make(map[string][]CartItem, len(carts))
	for rows.Next() {
		var item CartItem
		if err := rows.Scan(
			&item.ID,
			&item.CartID,
			&item.ProductID,
			&item.MasterProductID,
			&item.StoreAssortmentID,
			&item.ProductName,
			&item.PriceReference,
			&item.UnitPriceMinorUnits,
			&item.Currency,
			&item.Quantity,
			&item.Version,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		itemsByCartID[item.CartID] = append(itemsByCartID[item.CartID], item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for index := range carts {
		items := itemsByCartID[carts[index].ID]
		if items == nil {
			items = []CartItem{}
		}
		carts[index].Items = items
	}
	return carts, nil
}
