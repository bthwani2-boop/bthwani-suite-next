package coupons

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"time"
)

type ReservePricedInput struct {
	Code                  string
	ClientActorID         string
	CartID                string
	CheckoutIntentID      string
	StoreID               string
	FulfillmentMode       string
	SubtotalMinorUnits    int64
	DeliveryFeeMinorUnits int64
	Currency              string
}

func percentageBasisPoints(percent float64) (int64, error) {
	if math.IsNaN(percent) || math.IsInf(percent, 0) || percent <= 0 || percent > 100 {
		return 0, ErrInvalid
	}
	basisPoints := int64(math.Round(percent * 100))
	if basisPoints <= 0 || basisPoints > 10000 {
		return 0, ErrInvalid
	}
	return basisPoints, nil
}

func percentageDiscountMinorUnits(subtotalMinorUnits, basisPoints int64) (int64, error) {
	const maxInt64 = int64(1<<63 - 1)
	if subtotalMinorUnits <= 0 || basisPoints <= 0 || basisPoints > 10000 {
		return 0, ErrInvalid
	}
	if subtotalMinorUnits > (maxInt64-5000)/basisPoints {
		return 0, ErrInvalid
	}
	return (subtotalMinorUnits*basisPoints + 5000) / 10000, nil
}

func ReservePricedTx(ctx context.Context, tx *sql.Tx, input ReservePricedInput) (*Reservation, error) {
	if normalizeCode(input.Code) == "" {
		return nil, nil
	}
	if input.ClientActorID == "" || input.CartID == "" || input.CheckoutIntentID == "" ||
		input.StoreID == "" || input.SubtotalMinorUnits <= 1 || input.DeliveryFeeMinorUnits < 0 {
		return nil, ErrInvalid
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	code, err := validateCode(input.Code)
	if err != nil {
		return nil, err
	}
	coupon, err := scanCoupon(tx.QueryRowContext(ctx, `SELECT `+couponSelectColumns+`
		FROM dsh_coupons WHERE code_hash=$1 AND archived_at IS NULL FOR UPDATE`, HashCode(code)))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if coupon.Status != "active" || coupon.ApprovedAt == nil {
		return nil, ErrInactive
	}
	if coupon.StartsAt != nil {
		start, parseErr := time.Parse(time.RFC3339, *coupon.StartsAt)
		if parseErr != nil || now.Before(start) {
			return nil, ErrInactive
		}
	}
	if coupon.EndsAt != nil {
		end, parseErr := time.Parse(time.RFC3339, *coupon.EndsAt)
		if parseErr != nil || !now.Before(end) {
			return nil, ErrInactive
		}
	}
	if coupon.StoreID != nil && *coupon.StoreID != input.StoreID {
		return nil, ErrNotEligible
	}
	eligibleMode := false
	for _, mode := range coupon.EligibleFulfillmentModes {
		if mode == input.FulfillmentMode {
			eligibleMode = true
			break
		}
	}
	if !eligibleMode || input.SubtotalMinorUnits < coupon.MinSubtotalMinorUnits {
		return nil, ErrNotEligible
	}

	var globalUsed, clientUsed int
	if err := tx.QueryRowContext(ctx, `SELECT
		COUNT(*) FILTER (WHERE status='committed' OR (status='reserved' AND reserved_until>NOW())),
		COUNT(*) FILTER (WHERE client_actor_id=$2 AND (status='committed' OR (status='reserved' AND reserved_until>NOW())))
		FROM dsh_coupon_redemptions WHERE coupon_id=$1::uuid`, coupon.ID, input.ClientActorID).
		Scan(&globalUsed, &clientUsed); err != nil {
		return nil, err
	}
	if (coupon.GlobalUsageLimit > 0 && globalUsed >= coupon.GlobalUsageLimit) || clientUsed >= coupon.PerClientUsageLimit {
		return nil, ErrUsageLimit
	}

	var discount int64
	if coupon.DiscountType == "percent" {
		basisPoints, basisPointErr := percentageBasisPoints(coupon.DiscountPercent)
		if basisPointErr != nil {
			return nil, basisPointErr
		}
		discount, err = percentageDiscountMinorUnits(input.SubtotalMinorUnits, basisPoints)
		if err != nil {
			return nil, err
		}
	} else {
		discount = coupon.FixedDiscountMinorUnits
	}
	if coupon.MaxDiscountMinorUnits > 0 && discount > coupon.MaxDiscountMinorUnits {
		discount = coupon.MaxDiscountMinorUnits
	}
	if discount >= input.SubtotalMinorUnits {
		discount = input.SubtotalMinorUnits - 1
	}
	if discount <= 0 {
		return nil, ErrNotEligible
	}

	reservation := &Reservation{
		CouponID: coupon.ID, ClientActorID: input.ClientActorID, CartID: input.CartID,
		CheckoutIntentID: input.CheckoutIntentID, Status: "reserved",
		SubtotalMinorUnits: input.SubtotalMinorUnits, DiscountMinorUnits: discount,
		TotalMinorUnits: input.SubtotalMinorUnits + input.DeliveryFeeMinorUnits - discount,
		Currency:        input.Currency, CouponCodeLast4: coupon.CodeLast4,
	}
	reservedUntil := now.Add(30 * time.Minute)
	err = tx.QueryRowContext(ctx, `INSERT INTO dsh_coupon_redemptions
		(coupon_id,client_actor_id,cart_id,checkout_intent_id,status,
		subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,
		total_minor_units,currency,idempotency_key,reserved_until)
		VALUES ($1::uuid,$2,$3::uuid,$4::uuid,'reserved',$5,$6,$7,$8,$9,$10,$11)
		RETURNING id::text,reserved_until::text`,
		coupon.ID, input.ClientActorID, input.CartID, input.CheckoutIntentID,
		input.SubtotalMinorUnits, input.DeliveryFeeMinorUnits, discount,
		reservation.TotalMinorUnits, input.Currency, "checkout:"+input.CheckoutIntentID,
		reservedUntil).Scan(&reservation.ID, &reservation.ReservedUntil)
	if err != nil {
		return nil, err
	}
	return reservation, nil
}
