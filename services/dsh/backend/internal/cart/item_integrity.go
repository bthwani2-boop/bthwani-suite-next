package cart

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
)

// UpsertOwnedItem keeps the authenticated client, active cart, and store
// assortment on one authority boundary before delegating to the canonical
// server-side price snapshot. A cart or product identifier is never sufficient
// authority on its own, and an assortment from another store cannot enter the
// cart even through an internal caller.
func UpsertOwnedItem(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	storeID string,
	cartID string,
	input UpsertItemInput,
) (*CartItem, error) {
	if clientID == "" || storeID == "" || cartID == "" || input.MasterProductID == "" || input.Quantity < 1 {
		return nil, ErrInvalid
	}

	var ownedStoreCart bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM dsh_carts
			WHERE id = $1
			  AND client_id = $2
			  AND store_id = $3
			  AND state = 'active'
		)`, cartID, clientID, storeID,
	).Scan(&ownedStoreCart); err != nil {
		return nil, err
	}
	if !ownedStoreCart {
		return nil, ErrNotFound
	}

	return UpsertItem(ctx, db, storeID, cartID, input)
}

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
		       product_name, price_reference, unit_price, quantity, version,
		       created_at, updated_at
		FROM dsh_cart_items
		WHERE cart_id = ANY($1)
		ORDER BY cart_id, created_at`, pq.Array(cartIDs),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
			&item.UnitPrice,
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
