package coupons

import (
	"context"
	"database/sql"
	"fmt"
)

// ApplyPaymentOutcomeTx keeps the coupon projection in the same PostgreSQL
// transaction as the checkout projection and the durable WLT event receipt.
func ApplyPaymentOutcomeTx(
	ctx context.Context,
	tx *sql.Tx,
	checkoutIntentID,
	status string,
) error {
	if checkoutIntentID == "" || status == "" {
		return ErrInvalid
	}
	switch status {
	case "captured", "cod_collected":
		_, err := tx.ExecContext(ctx, `
			UPDATE dsh_coupon_redemptions
			SET reserved_until=GREATEST(reserved_until,NOW()+INTERVAL '24 hours'),
			    updated_at=NOW()
			WHERE checkout_intent_id=$1::uuid AND status='reserved'`, checkoutIntentID)
		return err
	case "failed", "expired":
		return ReleaseByIntentTx(ctx, tx, checkoutIntentID, "wlt_"+status)
	case "authorized", "reference_created", "cod_pending":
		return nil
	default:
		return fmt.Errorf("%w: unsupported payment status", ErrInvalid)
	}
}
