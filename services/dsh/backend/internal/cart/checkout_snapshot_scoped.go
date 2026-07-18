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

// GovernedCheckoutSnapshot is the OCC-locked, server-priced cart snapshot used
// by checkout. Amounts are minor units and never originate from client input.
type GovernedCheckoutSnapshot struct {
	SubtotalMinorUnits int64
	Currency           string
	SnapshotHash       string
	ItemCount          int
	CartVersion        int
}

// ComputeCheckoutSnapshotTx locks the authenticated active cart, verifies the
// caller's expected version, then prices every item from the persisted cart
// snapshot. It fails before checkout creation if the cart changed concurrently.
func ComputeCheckoutSnapshotTx(
	ctx context.Context,
	tx *sql.Tx,
	clientID, cartID, storeID string,
	expectedVersion int,
) (*GovernedCheckoutSnapshot, error) {
	if clientID == "" || cartID == "" || storeID == "" || expectedVersion <= 0 {
		return nil, ErrInvalid
	}

	var lockedStoreID string
	var currentVersion int
	err := tx.QueryRowContext(ctx, `
		SELECT store_id,version
		FROM dsh_carts
		WHERE id=$1::uuid AND client_id=$2 AND store_id=$3 AND state='active'
		FOR UPDATE`, cartID, clientID, storeID).Scan(&lockedStoreID, &currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if currentVersion != expectedVersion {
		return nil, fmt.Errorf("%w: expected cart version %d, current version %d", ErrConflict, expectedVersion, currentVersion)
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

	const maxInt64 = int64(1<<63 - 1)
	var subtotal int64
	itemCount := 0
	hasher := sha256.New()
	hasher.Write([]byte(fmt.Sprintf("%s|%s|%s|v%d", cartID, clientID, lockedStoreID, currentVersion)))
	for rows.Next() {
		var productID string
		var quantity int
		var unitPrice float64
		if err := rows.Scan(&productID, &quantity, &unitPrice); err != nil {
			return nil, err
		}
		if quantity <= 0 || unitPrice <= 0 || math.IsNaN(unitPrice) || math.IsInf(unitPrice, 0) {
			return nil, ErrCartItemMissingPrice
		}
		unitMinorUnits := int64(math.Round(unitPrice * 100))
		if unitMinorUnits <= 0 || int64(quantity) > maxInt64/unitMinorUnits {
			return nil, ErrCartItemMissingPrice
		}
		lineTotal := unitMinorUnits * int64(quantity)
		if lineTotal > maxInt64-subtotal {
			return nil, fmt.Errorf("%w: cart total exceeds supported range", ErrInvalid)
		}
		subtotal += lineTotal
		hasher.Write([]byte(fmt.Sprintf("|%s:%d:%d", productID, quantity, unitMinorUnits)))
		itemCount++
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if itemCount == 0 || subtotal <= 0 {
		return nil, fmt.Errorf("%w: cart has no priced items", ErrInvalid)
	}
	return &GovernedCheckoutSnapshot{
		SubtotalMinorUnits: subtotal,
		Currency:           "YER",
		SnapshotHash:       hex.EncodeToString(hasher.Sum(nil)),
		ItemCount:          itemCount,
		CartVersion:        currentVersion,
	}, nil
}

// ComputeCheckoutSnapshotForClientTx is retained for existing callers that do
// not yet carry an expected version. It still locks and scopes the cart, but
// new checkout code must use ComputeCheckoutSnapshotTx.
func ComputeCheckoutSnapshotForClientTx(
	ctx context.Context,
	tx *sql.Tx,
	cartID, clientID, storeID string,
) (*CartSnapshot, error) {
	if cartID == "" || clientID == "" || storeID == "" {
		return nil, ErrInvalid
	}
	var version int
	if err := tx.QueryRowContext(ctx, `
		SELECT version FROM dsh_carts
		WHERE id=$1::uuid AND client_id=$2 AND store_id=$3 AND state='active'
		FOR UPDATE`, cartID, clientID, storeID).Scan(&version); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	governed, err := ComputeCheckoutSnapshotTx(ctx, tx, clientID, cartID, storeID, version)
	if err != nil {
		return nil, err
	}
	return &CartSnapshot{
		AmountMinorUnits: governed.SubtotalMinorUnits,
		Currency:         governed.Currency,
		SnapshotHash:     governed.SnapshotHash,
	}, nil
}
