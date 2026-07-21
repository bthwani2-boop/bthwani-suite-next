package cart

import (
	"context"
	"database/sql"
	"errors"
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

// ClearOwnedCart is the explicit store-switch boundary. It removes the lines
// and transitions the owned active cart to abandoned in one transaction, so
// the single-active-cart invariant no longer traps the client on an empty cart.
func ClearOwnedCart(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	cartID string,
) error {
	if clientID == "" || cartID == "" {
		return ErrInvalid
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var lockedCartID string
	if err := tx.QueryRowContext(ctx, `
		SELECT id::text
		FROM dsh_carts
		WHERE id = $1::uuid AND client_id = $2 AND state = 'active'
		FOR UPDATE`, cartID, clientID,
	).Scan(&lockedCartID); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM dsh_cart_items WHERE cart_id = $1::uuid`, lockedCartID); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE dsh_carts
		SET state = 'abandoned', version = version + 1, updated_at = NOW()
		WHERE id = $1::uuid AND client_id = $2 AND state = 'active'`, lockedCartID, clientID)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return ErrConflict
	}
	return tx.Commit()
}
