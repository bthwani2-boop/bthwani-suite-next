package cart

import (
	"context"
	"database/sql"
)

// RemoveOwnedItem deletes only from an active cart owned by the authenticated
// client. Cart and item identifiers are never sufficient authority by themselves.
func RemoveOwnedItem(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	cartID string,
	itemID string,
) error {
	if clientID == "" || cartID == "" || itemID == "" {
		return ErrInvalid
	}
	res, err := db.ExecContext(ctx, `
		DELETE FROM dsh_cart_items item
		USING dsh_carts cart
		WHERE item.id = $1
		  AND item.cart_id = $2
		  AND cart.id = item.cart_id
		  AND cart.client_id = $3
		  AND cart.state = 'active'`,
		itemID, cartID, clientID,
	)
	if err != nil {
		return err
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ClearOwnedCart is intentionally idempotent for an owned active cart. It
// distinguishes an inaccessible cart from an already-empty owned cart.
func ClearOwnedCart(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	cartID string,
) error {
	if clientID == "" || cartID == "" {
		return ErrInvalid
	}
	var owned bool
	if err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM dsh_carts
			WHERE id = $1 AND client_id = $2 AND state = 'active'
		)`, cartID, clientID,
	).Scan(&owned); err != nil {
		return err
	}
	if !owned {
		return ErrNotFound
	}
	_, err := db.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id = $1`, cartID)
	return err
}
