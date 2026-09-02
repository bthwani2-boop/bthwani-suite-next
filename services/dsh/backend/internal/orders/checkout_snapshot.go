package orders

import (
	"database/sql"
	"errors"
	"fmt"
)

type checkoutOrderSourceItem struct {
	productID           string
	productName         string
	unitPriceMinor      int64
	quantity            int
	lineTotalMinorUnits int64
	currency            string
}

type checkoutOrderSnapshot struct {
	cartID              string
	storeID             string
	cartVersion         int
	pricingSnapshotHash string
	subtotalMinorUnits  int64
	currency            string
	itemCount           int
	items               []checkoutOrderSourceItem
}

func loadCheckoutOrderSnapshotTx(
	tx *sql.Tx,
	checkoutIntentID, operatorContextID, clientID, expectedCartID, expectedStoreID string,
	expectedSubtotalMinorUnits int64,
	expectedCurrency, expectedPricingSnapshotHash string,
) (*checkoutOrderSnapshot, error) {
	var snapshot checkoutOrderSnapshot
	err := tx.QueryRow(`
		SELECT cart_id::text, store_id, cart_version, pricing_snapshot_hash,
		       subtotal_minor_units, currency, item_count
		FROM dsh_checkout_cart_snapshots
		WHERE checkout_intent_id=$1::uuid
		  AND operator_context_id=$2
		  AND client_id=$3
		FOR SHARE`, checkoutIntentID, operatorContextID, clientID,
	).Scan(
		&snapshot.cartID,
		&snapshot.storeID,
		&snapshot.cartVersion,
		&snapshot.pricingSnapshotHash,
		&snapshot.subtotalMinorUnits,
		&snapshot.currency,
		&snapshot.itemCount,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: canonical checkout item snapshot is missing", ErrConflict)
	}
	if err != nil {
		return nil, err
	}
	if snapshot.cartID != expectedCartID || snapshot.storeID != expectedStoreID ||
		snapshot.subtotalMinorUnits != expectedSubtotalMinorUnits ||
		snapshot.currency != expectedCurrency ||
		snapshot.pricingSnapshotHash != expectedPricingSnapshotHash ||
		snapshot.cartVersion <= 0 || snapshot.itemCount <= 0 {
		return nil, fmt.Errorf("%w: checkout item snapshot does not match checkout truth", ErrConflict)
	}

	rows, err := tx.Query(`
		SELECT product_id, product_name, unit_price_minor, quantity,
		       line_total_minor_units, currency
		FROM dsh_checkout_item_snapshots
		WHERE checkout_intent_id=$1::uuid
		ORDER BY line_number`, checkoutIntentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var subtotal int64
	for rows.Next() {
		var item checkoutOrderSourceItem
		if err := rows.Scan(
			&item.productID,
			&item.productName,
			&item.unitPriceMinor,
			&item.quantity,
			&item.lineTotalMinorUnits,
			&item.currency,
		); err != nil {
			return nil, err
		}
		if item.quantity <= 0 || item.unitPriceMinor <= 0 || item.lineTotalMinorUnits <= 0 ||
			item.lineTotalMinorUnits != item.unitPriceMinor*int64(item.quantity) ||
			item.currency != snapshot.currency {
			return nil, fmt.Errorf("%w: invalid canonical checkout item snapshot", ErrConflict)
		}
		if item.lineTotalMinorUnits > int64(^uint64(0)>>1)-subtotal {
			return nil, fmt.Errorf("%w: checkout item snapshot subtotal overflow", ErrConflict)
		}
		subtotal += item.lineTotalMinorUnits
		snapshot.items = append(snapshot.items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(snapshot.items) != snapshot.itemCount || subtotal != snapshot.subtotalMinorUnits {
		return nil, fmt.Errorf("%w: checkout item snapshot is incomplete or inconsistent", ErrConflict)
	}
	return &snapshot, nil
}
