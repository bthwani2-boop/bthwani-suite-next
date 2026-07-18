package checkout

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
)

type PricingSnapshot struct {
	SubtotalMinorUnits    int64  `json:"subtotalMinorUnits"`
	DeliveryFeeMinorUnits int64  `json:"deliveryFeeMinorUnits"`
	DiscountMinorUnits    int64  `json:"discountMinorUnits"`
	TotalMinorUnits       int64  `json:"totalMinorUnits"`
	Currency              string `json:"currency"`
	SnapshotHash          string `json:"pricingSnapshotHash"`
	CouponID              string `json:"couponId,omitempty"`
	CouponRedemptionID    string `json:"couponRedemptionId,omitempty"`
	CouponCodeLast4       string `json:"couponCodeLast4,omitempty"`
}

func BuildPricingSnapshotHash(cartSnapshotHash, couponID string, subtotal, deliveryFee, discount, total int64) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%d|%d|%d|%d", cartSnapshotHash, couponID, subtotal, deliveryFee, discount, total)))
	return hex.EncodeToString(sum[:])
}

func validatePricing(pricing PricingSnapshot) error {
	if pricing.SubtotalMinorUnits <= 0 || pricing.DeliveryFeeMinorUnits < 0 || pricing.DiscountMinorUnits < 0 || pricing.TotalMinorUnits <= 0 {
		return ErrInvalid
	}
	if pricing.TotalMinorUnits != pricing.SubtotalMinorUnits+pricing.DeliveryFeeMinorUnits-pricing.DiscountMinorUnits {
		return ErrInvalid
	}
	if pricing.Currency == "" || pricing.SnapshotHash == "" {
		return ErrInvalid
	}
	if (pricing.CouponID == "") != (pricing.CouponRedemptionID == "") {
		return ErrInvalid
	}
	return nil
}

func CreatePricedIntentTx(ctx context.Context, tx *sql.Tx, input CreateIntentInput, pricing PricingSnapshot) (*Intent, error) {
	input.TenantID = strings.TrimSpace(input.TenantID)
	if input.ID == "" || input.TenantID == "" || input.ClientID == "" || input.CartID == "" || input.StoreID == "" {
		return nil, ErrInvalid
	}
	if err := validatePricing(pricing); err != nil {
		return nil, err
	}
	if input.FulfillmentMode == "" {
		input.FulfillmentMode = ModeBthwaniDelivery
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = MethodCOD
	}
	row := tx.QueryRowContext(ctx, `
		INSERT INTO dsh_checkout_intents
			(id,tenant_id,client_id,cart_id,store_id,fulfillment_mode,state,payment_method,
			wlt_payment_session_id,delivery_address,note,subtotal_minor_units,
			delivery_fee_minor_units,discount_minor_units,total_minor_units,currency,
			pricing_snapshot_hash,coupon_id,coupon_redemption_id,coupon_code_last4)
		VALUES ($1::uuid,$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
			NULLIF($18,'')::uuid,NULLIF($19,'')::uuid,$20)
		RETURNING id,tenant_id,client_id,cart_id::text,store_id::text,fulfillment_mode,
			state,payment_method,wlt_payment_session_id,delivery_address,note,
			version,created_at,updated_at`,
		input.ID, input.TenantID, input.ClientID, input.CartID, input.StoreID,
		string(input.FulfillmentMode), string(StatePending), string(input.PaymentMethod),
		input.WltPaymentSessionID, input.DeliveryAddress, input.Note,
		pricing.SubtotalMinorUnits, pricing.DeliveryFeeMinorUnits, pricing.DiscountMinorUnits,
		pricing.TotalMinorUnits, pricing.Currency, pricing.SnapshotHash, pricing.CouponID,
		pricing.CouponRedemptionID, pricing.CouponCodeLast4)
	return scanIntent(row)
}

func GetPricing(db *sql.DB, intentID string) (PricingSnapshot, error) {
	return scanPricing(db.QueryRow(`
		SELECT subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,
			total_minor_units,currency,pricing_snapshot_hash,
			COALESCE(coupon_id::text,''),COALESCE(coupon_redemption_id::text,''),
			coupon_code_last4
		FROM dsh_checkout_intents WHERE id=$1::uuid`, intentID))
}

func GetPricingTx(ctx context.Context, tx *sql.Tx, intentID string) (PricingSnapshot, error) {
	return scanPricing(tx.QueryRowContext(ctx, `
		SELECT subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,
			total_minor_units,currency,pricing_snapshot_hash,
			COALESCE(coupon_id::text,''),COALESCE(coupon_redemption_id::text,''),
			coupon_code_last4
		FROM dsh_checkout_intents WHERE id=$1::uuid`, intentID))
}

func scanPricing(row interface{ Scan(dest ...any) error }) (PricingSnapshot, error) {
	var pricing PricingSnapshot
	err := row.Scan(
		&pricing.SubtotalMinorUnits, &pricing.DeliveryFeeMinorUnits,
		&pricing.DiscountMinorUnits, &pricing.TotalMinorUnits,
		&pricing.Currency, &pricing.SnapshotHash, &pricing.CouponID,
		&pricing.CouponRedemptionID, &pricing.CouponCodeLast4,
	)
	if err != nil {
		return PricingSnapshot{}, err
	}
	return pricing, nil
}
