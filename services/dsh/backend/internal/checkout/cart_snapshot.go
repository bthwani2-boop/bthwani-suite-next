package checkout

import (
	"context"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
)

// PersistCartSnapshotInput binds a priced Checkout Intent to the live cart
// state protected inside the same checkout transaction. The persisted rows are
// the sole commercial line source for later order creation.
type PersistCartSnapshotInput struct {
	CheckoutIntentID    string
	OperatorContextID   string
	ClientID            string
	CartID              string
	StoreID             string
	PricingSnapshotHash string
	SubtotalMinorUnits  int64
	Currency            string
}

func normalizePersistCartSnapshotInput(input PersistCartSnapshotInput) PersistCartSnapshotInput {
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.CartID = strings.TrimSpace(input.CartID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.PricingSnapshotHash = strings.TrimSpace(input.PricingSnapshotHash)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	return input
}

func validatePersistCartSnapshotInput(input PersistCartSnapshotInput) error {
	if input.CheckoutIntentID == "" || input.OperatorContextID == "" || input.ClientID == "" ||
		input.CartID == "" || input.StoreID == "" || input.SubtotalMinorUnits <= 0 ||
		len(input.Currency) != 3 {
		return ErrInvalid
	}
	decoded, err := hex.DecodeString(input.PricingSnapshotHash)
	if err != nil || len(decoded) != 32 {
		return ErrInvalid
	}
	return nil
}

// PersistCartSnapshotTx locks the governed cart itself, copies its current
// lines into immutable checkout-owned rows, and proves that the copied count,
// subtotal, and currency match the priced Checkout Intent. Any mismatch aborts
// the surrounding transaction. There is intentionally no live-cart fallback
// after this boundary.
func PersistCartSnapshotTx(ctx context.Context, tx *sql.Tx, rawInput PersistCartSnapshotInput) error {
	if tx == nil {
		return ErrInvalid
	}
	input := normalizePersistCartSnapshotInput(rawInput)
	if err := validatePersistCartSnapshotInput(input); err != nil {
		return err
	}

	var cartVersion int
	if err := tx.QueryRowContext(ctx, `
		SELECT version
		FROM dsh_carts
		WHERE id=$1::uuid AND client_id=$2 AND store_id=$3 AND state='active'
		FOR UPDATE`, input.CartID, input.ClientID, input.StoreID,
	).Scan(&cartVersion); errorsIsNoRows(err) {
		return fmt.Errorf("%w: cart is no longer eligible for checkout snapshot", ErrConflict)
	} else if err != nil {
		return err
	}

	var itemCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)::integer
		FROM dsh_cart_items
		WHERE cart_id=$1::uuid`, input.CartID,
	).Scan(&itemCount); err != nil {
		return err
	}
	if itemCount <= 0 {
		return fmt.Errorf("%w: checkout cart snapshot has no items", ErrConflict)
	}

	result, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_checkout_cart_snapshots
			(checkout_intent_id, operator_context_id, client_id, cart_id, store_id,
			 cart_version, pricing_snapshot_hash, subtotal_minor_units, currency, item_count)
		SELECT ci.id, ci.operator_context_id, ci.client_id, ci.cart_id, ci.store_id,
		       $9, ci.pricing_snapshot_hash, ci.subtotal_minor_units, ci.currency, $10
		FROM dsh_checkout_intents ci
		WHERE ci.id = $1::uuid
		  AND ci.operator_context_id = $2
		  AND ci.client_id = $3
		  AND ci.cart_id = $4::uuid
		  AND ci.store_id = $5
		  AND ci.pricing_snapshot_hash = $6
		  AND ci.subtotal_minor_units = $7
		  AND ci.currency = $8`,
		input.CheckoutIntentID,
		input.OperatorContextID,
		input.ClientID,
		input.CartID,
		input.StoreID,
		input.PricingSnapshotHash,
		input.SubtotalMinorUnits,
		input.Currency,
		cartVersion,
		itemCount,
	)
	if err != nil {
		return err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return fmt.Errorf("%w: checkout/cart snapshot identity or pricing changed concurrently", ErrConflict)
	}

	if _, err = tx.ExecContext(ctx, `
		WITH ranked AS (
			SELECT
				(row_number() OVER (ORDER BY item.created_at, item.id))::integer AS line_number,
				item.product_id,
				item.product_name,
				item.quantity,
				item.unit_price_minor,
				UPPER(BTRIM(item.currency)) AS currency,
				item.unit_price_minor * item.quantity::bigint AS line_total_minor_units
			FROM dsh_cart_items item
			WHERE item.cart_id = $2::uuid
		)
		INSERT INTO dsh_checkout_item_snapshots
			(checkout_intent_id, line_number, product_id, product_name, quantity,
			 unit_price_minor, currency, line_total_minor_units)
		SELECT $1::uuid, line_number, product_id, product_name, quantity,
		       unit_price_minor, currency, line_total_minor_units
		FROM ranked
		ORDER BY line_number`, input.CheckoutIntentID, input.CartID); err != nil {
		return err
	}

	var (
		expectedCount     int
		persistedCount    int
		persistedSubtotal int64
		minCurrency       string
		maxCurrency       string
	)
	if err = tx.QueryRowContext(ctx, `
		SELECT snapshot.item_count,
		       COUNT(item.line_number),
		       COALESCE(SUM(item.line_total_minor_units), 0),
		       COALESCE(MIN(item.currency), ''),
		       COALESCE(MAX(item.currency), '')
		FROM dsh_checkout_cart_snapshots snapshot
		LEFT JOIN dsh_checkout_item_snapshots item
		  ON item.checkout_intent_id = snapshot.checkout_intent_id
		WHERE snapshot.checkout_intent_id = $1::uuid
		GROUP BY snapshot.item_count`, input.CheckoutIntentID,
	).Scan(&expectedCount, &persistedCount, &persistedSubtotal, &minCurrency, &maxCurrency); err != nil {
		return err
	}
	if expectedCount != itemCount || persistedCount != expectedCount ||
		persistedSubtotal != input.SubtotalMinorUnits ||
		minCurrency != input.Currency || maxCurrency != input.Currency {
		return fmt.Errorf(
			"%w: persisted checkout item snapshot differs from priced checkout truth",
			ErrConflict,
		)
	}
	return nil
}

func errorsIsNoRows(err error) bool {
	return err == sql.ErrNoRows
}
