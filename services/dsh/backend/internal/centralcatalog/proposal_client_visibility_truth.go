package centralcatalog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// validateProposalClientVisibilityTruth is the canonical publication gate for
// proposal-driven client visibility. The legacy assortment unit_price column is
// not authoritative: visibility requires the same normalized effective price
// and inventory truth consumed by storefront and cart.
func validateProposalClientVisibilityTruth(
	ctx context.Context,
	tx *sql.Tx,
	storeID string,
	masterProductID string,
) (string, error) {
	var assortmentID string
	var available bool
	err := tx.QueryRowContext(ctx, `
		SELECT id, available
		FROM dsh_store_assortments
		WHERE store_id = $1 AND master_product_id = $2
		FOR UPDATE`, storeID, masterProductID).Scan(&assortmentID, &available)
	if errors.Is(err, sql.ErrNoRows) {
		return "", fmt.Errorf("%w: store assortment not found", ErrNotFound)
	}
	if err != nil {
		return "", err
	}
	if !available {
		return "", fmt.Errorf("%w: store assortment must be available", ErrInvalid)
	}

	truth, err := readAssortmentRuntimeTruth(ctx, tx, assortmentID)
	if errors.Is(err, ErrNotFound) {
		return "", fmt.Errorf("%w: client visibility requires effective price and inventory truth", ErrInvalid)
	}
	if err != nil {
		return "", err
	}
	if !assortmentTruthPurchasable(truth) {
		return "", fmt.Errorf("%w: client visibility requires a purchasable normalized assortment", ErrInvalid)
	}
	return assortmentID, nil
}
