package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// resolveStoreAssortmentID resolves the canonical assortment identity for a
// store/product pair. Commercial readback must bind to this identity before
// reading normalized inventory or price truth.
func resolveStoreAssortmentID(ctx context.Context, db *sql.DB, storeID, masterProductID string) (string, error) {
	storeID = strings.TrimSpace(storeID)
	masterProductID = strings.TrimSpace(masterProductID)
	if storeID == "" || masterProductID == "" {
		return "", ErrInvalid
	}

	var assortmentID string
	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM dsh_store_assortments
		WHERE store_id=$1 AND master_product_id=$2`, storeID, masterProductID).Scan(&assortmentID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}
	return assortmentID, nil
}

// GetAssortmentInventoryRuntimeTruth is the canonical partner/operator
// inventory read authority. It reads the same normalized row mutated by
// UpsertAssortmentInventoryWithRuntimeTruthAtomic and exposes its OCC version;
// compatibility projections on dsh_store_assortments are deliberately not
// consulted.
func GetAssortmentInventoryRuntimeTruth(ctx context.Context, db *sql.DB, storeID, masterProductID string) (StoreAssortmentInventory, error) {
	assortmentID, err := resolveStoreAssortmentID(ctx, db, storeID, masterProductID)
	if err != nil {
		return StoreAssortmentInventory{}, err
	}

	var inv StoreAssortmentInventory
	err = db.QueryRowContext(ctx, `
		SELECT store_assortment_id, policy_type, quantity, reserved_quantity,
		       min_order_quantity, max_order_quantity, step_quantity, version, updated_at
		FROM dsh_store_assortment_inventory
		WHERE store_assortment_id=$1`, assortmentID).Scan(
		&inv.StoreAssortmentID,
		&inv.PolicyType,
		&inv.Quantity,
		&inv.ReservedQuantity,
		&inv.MinOrderQuantity,
		&inv.MaxOrderQuantity,
		&inv.StepQuantity,
		&inv.Version,
		&inv.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return StoreAssortmentInventory{}, ErrNotFound
	}
	return inv, err
}

// ListAssortmentPriceRuntimeTruth returns the normalized schedule rows for the
// exact assortment. Ordering mirrors effective-price resolution: newest
// effective_from/version/id first, so consumers can reconcile a write without
// inventing a second precedence rule.
func ListAssortmentPriceRuntimeTruth(ctx context.Context, db *sql.DB, storeID, masterProductID string) ([]StoreAssortmentPrice, error) {
	assortmentID, err := resolveStoreAssortmentID(ctx, db, storeID, masterProductID)
	if err != nil {
		return nil, err
	}

	rows, err := db.QueryContext(ctx, `
		SELECT id, store_assortment_id, amount_minor, currency,
		       prep_time_min, prep_time_max, effective_from, effective_until, version
		FROM dsh_store_assortment_prices
		WHERE store_assortment_id=$1
		ORDER BY effective_from DESC, version DESC, id DESC`, assortmentID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := make([]StoreAssortmentPrice, 0)
	for rows.Next() {
		var price StoreAssortmentPrice
		if err := rows.Scan(
			&price.ID,
			&price.StoreAssortmentID,
			&price.AmountMinor,
			&price.Currency,
			&price.PrepTimeMin,
			&price.PrepTimeMax,
			&price.EffectiveFrom,
			&price.EffectiveUntil,
			&price.Version,
		); err != nil {
			return nil, err
		}
		out = append(out, price)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
