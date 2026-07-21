package checkout

import (
	"context"
	"database/sql"
	"strings"
)

// CreatePricedIntentWithAddressTx keeps the existing pricing transaction as the
// source of truth and binds the already-authorized client address reference in
// the same transaction. Pickup checkout deliberately carries no address.
func CreatePricedIntentWithAddressTx(
	ctx context.Context,
	tx *sql.Tx,
	input CreateIntentInput,
	pricing PricingSnapshot,
	deliveryAddressID string,
) (*Intent, error) {
	if input.FulfillmentMode != ModePickup && strings.TrimSpace(deliveryAddressID) == "" {
		return nil, ErrInvalid
	}
	intent, err := CreatePricedIntentTx(ctx, tx, input, pricing)
	if err != nil {
		return nil, err
	}
	if input.FulfillmentMode == ModePickup {
		return intent, nil
	}
	result, err := tx.ExecContext(ctx, `UPDATE dsh_checkout_intents
		SET delivery_address_id = $1
		WHERE id = $2::uuid AND client_id = $3 AND delivery_address_id IS NULL`,
		strings.TrimSpace(deliveryAddressID), input.ID, input.ClientID)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrConflict
	}
	return intent, nil
}
