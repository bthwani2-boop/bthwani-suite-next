package cart

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
)

var ErrVersionConflict = ErrConflict

// GovernedCheckoutSnapshot is the OCC-locked, server-priced cart snapshot used
// by checkout. Amounts and currency are snapshotted from DSH catalog truth and
// never originate from client input.
type GovernedCheckoutSnapshot struct {
	SubtotalMinorUnits int64
	Currency           string
	SnapshotHash       string
	ItemCount          int
	CartVersion        int
	Lines              []CheckoutSnapshotLine
}

// CheckoutSnapshotLine is the immutable catalog-price input that DSH submits
// to WLT for its sovereign checkout quote. It is collected while the cart is
// locked, so a later cart mutation cannot alter this handoff.
type CheckoutSnapshotLine struct {
	MasterProductID     string
	Quantity            int
	UnitPriceMinorUnits int64
	Currency            string
}

// ComputeCheckoutSnapshotTx locks the authenticated active cart, verifies the
// caller's expected version, then prices every item from the canonical integer
// minor-unit snapshot written at add-to-cart time. It fails before checkout
// creation if the cart changed concurrently or contains an unpriced item.
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
		return nil, fmt.Errorf("%w: expected cart version %d, current version %d", ErrVersionConflict, expectedVersion, currentVersion)
	}

	rows, err := tx.QueryContext(ctx, `
		SELECT product_id,quantity,unit_price_minor,currency
		FROM dsh_cart_items
		WHERE cart_id=$1::uuid
		ORDER BY created_at,id`, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	const maxInt64 = int64(1<<63 - 1)
	var subtotal int64
	currency := ""
	itemCount := 0
	lines := make([]CheckoutSnapshotLine, 0)
	hasher := sha256.New()
	fmt.Fprintf(hasher, "%s|%s|%s|v%d", cartID, clientID, lockedStoreID, currentVersion)
	for rows.Next() {
		var productID string
		var quantity int
		var unitMinorUnits int64
		var itemCurrency string
		if err := rows.Scan(&productID, &quantity, &unitMinorUnits, &itemCurrency); err != nil {
			return nil, err
		}
		if quantity <= 0 || unitMinorUnits <= 0 {
			return nil, ErrCartItemMissingPrice
		}
		if itemCurrency == "" {
			return nil, ErrCartItemCurrency
		}
		if currency == "" {
			currency = itemCurrency
		} else if currency != itemCurrency {
			return nil, ErrCartItemCurrency
		}
		if int64(quantity) > maxInt64/unitMinorUnits {
			return nil, fmt.Errorf("%w: cart line total exceeds supported range", ErrInvalid)
		}
		lineTotal := unitMinorUnits * int64(quantity)
		if lineTotal > maxInt64-subtotal {
			return nil, fmt.Errorf("%w: cart total exceeds supported range", ErrInvalid)
		}
		subtotal += lineTotal
		fmt.Fprintf(hasher, "|%s:%d:%d:%s", productID, quantity, unitMinorUnits, itemCurrency)
		lines = append(lines, CheckoutSnapshotLine{MasterProductID: productID, Quantity: quantity, UnitPriceMinorUnits: unitMinorUnits, Currency: itemCurrency})
		itemCount++
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if itemCount == 0 || subtotal <= 0 || currency == "" {
		return nil, fmt.Errorf("%w: cart has no priced items", ErrInvalid)
	}
	return &GovernedCheckoutSnapshot{
		SubtotalMinorUnits: subtotal,
		Currency:           currency,
		SnapshotHash:       hex.EncodeToString(hasher.Sum(nil)),
		ItemCount:          itemCount,
		CartVersion:        currentVersion,
		Lines:              lines,
	}, nil
}
