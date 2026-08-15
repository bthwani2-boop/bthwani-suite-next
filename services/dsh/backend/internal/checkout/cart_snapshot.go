package checkout

import (
	"context"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
)

// PersistCartSnapshotInput binds the OCC-locked cart snapshot used to price a
// checkout to the durable Checkout Intent created in the same transaction.
// The persisted rows are the sole commercial line source for order creation.
type PersistCartSnapshotInput struct {
	CheckoutIntentID  string
	OperatorContextID string
	ClientID          string
	CartID            string
	StoreID           string
	CartVersion       int
	CartSnapshotHash  string
	SubtotalMinorUnits int64
	Currency          string
	ItemCount         int
}

func validatePersistCartSnapshotInput(input PersistCartSnapshotInput) error {
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.CartID = strings.TrimSpace(input.CartID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.CartSnapshotHash = strings.TrimSpace(input.CartSnapshotHash)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if input.CheckoutIntentID == "" || input.OperatorContextID == "" || input.ClientID == "" ||
		input.CartID == "" || input.StoreID == "" || input.CartVersion <= 0 ||
		input.SubtotalMinorUnits <= 0 || input.ItemCount <= 0 || len(input.Currency) != 3 {
		return ErrInvalid
	}
	decoded, err := hex.DecodeString(input.CartSnapshotHash)
	if err != nil || len(decoded) != 32 {
		return ErrInvalid
	}
	return nil
}

// PersistCartSnapshotTx persists the exact cart state already protected by the
// cart aggregate's FOR UPDATE lock. The checkout row, cart identity/version,
// item count, subtotal, and currency must all agree or the transaction fails
// closed. No live-cart fallback is permitted after this boundary.
func PersistCartSnapshotTx(ctx context.Context, tx *sql.Tx, input PersistCartSnapshotInput) error {
	if tx == nil {
		return ErrInvalid
	}
	input.CheckoutIntentID = strings.TrimSpace(input.CheckoutIntentID)
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.ClientID = strings.TrimSpace(input.ClientID)
	input.CartID = strings.TrimSpace(input.CartID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.CartSnapshotHash = strings.TrimSpace(input.CartSnapshotHash)
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	if err := validatePersistCartSnapshotInput(input); err != nil {
		return err
	}

	result, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_checkout_cart_snapshots
			(checkout_intent_id, operator_context_id, client_id, cart_id, store_id,
			 cart_version, cart_snapshot_hash, subtotal_minor_units, currency, item_count)
		SELECT ci.id, ci.operator_context_id, ci.client_id, ci.cart_id, ci.store_id,
		       $6, $7, $8, $9, $10
		FROM dsh_checkout_intents ci
		JOIN dsh_carts cart ON cart.id = ci.cart_id
		WHERE ci.id = $1::uuid
		  AND ci.operator_context_id = $2
		  AND ci.client_id = $3
		  AND ci.cart_id = $4::uuid
		  AND ci.store_id = $5
		  AND ci.subtotal_minor_units = $8
		  AND ci.currency = $9
		  AND cart.client_id = $3
		  AND cart.store_id = $5
		  AND cart.state = 'active'
		  AND cart.version = $6`,
		input.CheckoutIntentID,
		input.OperatorContextID,
		input.ClientID,
		input.CartID,
		input.StoreID,
		input.CartVersion,
		input.CartSnapshotHash,
		input.SubtotalMinorUnits,
		input.Currency,
		input.ItemCount,
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
		persistedCount    int
		persistedSubtotal int64
		minCurrency       string
		maxCurrency       string
	)
	if err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(line_total_minor_units), 0),
		       COALESCE(MIN(currency), ''), COALESCE(MAX(currency), '')
		FROM dsh_checkout_item_snapshots
		WHERE checkout_intent_id = $1::uuid`, input.CheckoutIntentID,
	).Scan(&persistedCount, &persistedSubtotal, &minCurrency, &maxCurrency); err != nil {
		return err
	}
	if persistedCount != input.ItemCount || persistedSubtotal != input.SubtotalMinorUnits ||
		minCurrency != input.Currency || maxCurrency != input.Currency {
		return fmt.Errorf(
			"%w: persisted checkout item snapshot differs from governed cart snapshot",
			ErrConflict,
		)
	}
	return nil
}
