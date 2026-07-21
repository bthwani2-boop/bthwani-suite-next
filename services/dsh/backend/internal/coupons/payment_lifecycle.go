package coupons

import (
	"database/sql"
	"fmt"
)

// ApplyPaymentOutcome keeps coupon reservations aligned with WLT, the payment
// authority. Captured payments lock the reservation long enough for order
// creation; failed/expired payments release it for future use.
func ApplyPaymentOutcome(db *sql.DB, checkoutIntentID, status string) error {
	if checkoutIntentID == "" || status == "" {
		return ErrInvalid
	}
	switch status {
	case "captured", "cod_collected":
		_, err := db.Exec(`UPDATE dsh_coupon_redemptions
			SET reserved_until=GREATEST(reserved_until,NOW()+INTERVAL '24 hours'),updated_at=NOW()
			WHERE checkout_intent_id=$1::uuid AND status='reserved'`, checkoutIntentID)
		return err
	case "failed", "expired":
		return ReleaseByIntent(db, checkoutIntentID, "wlt_"+status)
	case "authorized", "reference_created", "cod_pending":
		return nil
	default:
		return fmt.Errorf("%w: unsupported payment status", ErrInvalid)
	}
}
