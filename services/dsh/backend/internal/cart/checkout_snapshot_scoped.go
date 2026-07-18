package cart

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
)

// ComputeCheckoutSnapshotForClientTx is the checkout-safe variant of the
// legacy snapshot helper. It locks and validates the active cart against the
// authenticated client and requested store before reading any prices.
func ComputeCheckoutSnapshotForClientTx(
	ctx context.Context,
	tx *sql.Tx,
	cartID, clientID, storeID string,
) (*CartSnapshot, error) {
	if cartID == "" || clientID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	var lockedStoreID string
	err := tx.QueryRowContext(ctx, `
		SELECT store_id
		FROM dsh_carts
		WHERE id=$1::uuid AND client_id=$2 AND store_id=$3 AND state='active'
		FOR UPDATE`, cartID, clientID, storeID).Scan(&lockedStoreID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT product_id,quantity,unit_price
		FROM dsh_cart_items
		WHERE cart_id=$1::uuid
		ORDER BY created_at,id`, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var totalMinorUnits int64
	itemCount := 0
	hasher := sha256.New()
	hasher.Write([]byte(cartID + "|" + clientID + "|" + lockedStoreID))
	for rows.Next() {
		var productID string
		var quantity int
		var unitPrice float64
		if err := rows.Scan(&productID, &quantity, &unitPrice); err != nil {
			return nil, err
		}
		if quantity <= 0 || unitPrice <= 0 {
			return nil, ErrCartItemMissingPrice
		}
		unitMinorUnits := int64(math.Round(unitPrice * 100))
		if unitMinorUnits <= 0 {
			return nil, ErrCartItemMissingPrice
		}
		totalMinorUnits += unitMinorUnits * int64(quantity)
		hasher.Write([]byte(fmt.Sprintf("|%s:%d:%d", productID, quantity, unitMinorUnits)))
		itemCount++
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if itemCount == 0 {
		return nil, fmt.Errorf("%w: cart has no items", ErrInvalid)
	}
	return &CartSnapshot{
		AmountMinorUnits: totalMinorUnits,
		Currency:         "YER",
		SnapshotHash:     hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}
