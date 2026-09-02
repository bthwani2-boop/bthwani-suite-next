package coupons

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

var (
	ErrNotFound        = errors.New("coupon not found")
	ErrInvalid         = errors.New("invalid coupon input")
	ErrInactive        = errors.New("coupon is not active")
	ErrNotEligible     = errors.New("coupon is not eligible")
	ErrUsageLimit      = errors.New("coupon usage limit reached")
	ErrVersionConflict = errors.New("coupon version conflict")
)

type Coupon struct {
	ID                       string   `json:"id"`
	NameAr                   string   `json:"nameAr"`
	Description              string   `json:"description"`
	CodeLast4                string   `json:"codeLast4"`
	StoreID                  *string  `json:"storeId,omitempty"`
	DiscountType             string   `json:"discountType"`
	DiscountPercent          float64  `json:"discountPercent"`
	FixedDiscountMinorUnits  int64    `json:"fixedDiscountMinorUnits"`
	MaxDiscountMinorUnits    int64    `json:"maxDiscountMinorUnits"`
	MinSubtotalMinorUnits    int64    `json:"minSubtotalMinorUnits"`
	GlobalUsageLimit         int      `json:"globalUsageLimit"`
	PerClientUsageLimit      int      `json:"perClientUsageLimit"`
	EligibleFulfillmentModes []string `json:"eligibleFulfillmentModes"`
	StartsAt                 *string  `json:"startsAt,omitempty"`
	EndsAt                   *string  `json:"endsAt,omitempty"`
	Status                   string   `json:"status"`
	CreatedByActorID         string   `json:"createdByActorId"`
	ApprovedByActorID        string   `json:"approvedByActorId,omitempty"`
	ApprovedAt               *string  `json:"approvedAt,omitempty"`
	Version                  int      `json:"version"`
	CreatedAt                string   `json:"createdAt"`
	UpdatedAt                string   `json:"updatedAt"`
}

type IssuedCoupon struct {
	Coupon Coupon `json:"coupon"`
	Code   string `json:"code"`
}

type CreateInput struct {
	NameAr                   string
	Description              string
	Code                     string
	StoreID                  *string
	DiscountType             string
	DiscountPercent          float64
	FixedDiscountMinorUnits  int64
	MaxDiscountMinorUnits    int64
	MinSubtotalMinorUnits    int64
	GlobalUsageLimit         int
	PerClientUsageLimit      int
	EligibleFulfillmentModes []string
	StartsAt                 *time.Time
	EndsAt                   *time.Time
	ActorID                  string
}

type UpdateInput struct {
	NameAr                   *string
	Description              *string
	StoreID                  **string
	DiscountType             *string
	DiscountPercent          *float64
	FixedDiscountMinorUnits  *int64
	MaxDiscountMinorUnits    *int64
	MinSubtotalMinorUnits    *int64
	GlobalUsageLimit         *int
	PerClientUsageLimit      *int
	EligibleFulfillmentModes *[]string
	StartsAt                 **time.Time
	EndsAt                   **time.Time
	Status                   *string
	ExpectedVersion          int
	ActorID                  string
}

type Reservation struct {
	ID                 string `json:"id"`
	CouponID           string `json:"couponId"`
	ClientActorID      string `json:"clientActorId"`
	CartID             string `json:"cartId"`
	CheckoutIntentID   string `json:"checkoutIntentId"`
	OrderID            string `json:"orderId,omitempty"`
	Status             string `json:"status"`
	SubtotalMinorUnits int64  `json:"subtotalMinorUnits"`
	DiscountMinorUnits int64  `json:"discountMinorUnits"`
	TotalMinorUnits    int64  `json:"totalMinorUnits"`
	Currency           string `json:"currency"`
	ReservedUntil      string `json:"reservedUntil"`
	CouponCodeLast4    string `json:"couponCodeLast4"`
}

type ReserveInput struct {
	Code               string
	ClientActorID      string
	CartID             string
	CheckoutIntentID   string
	StoreID            string
	FulfillmentMode    string
	SubtotalMinorUnits int64
	Currency           string
}

const couponSelectColumns = `id::text,name_ar,description,code_last4,store_id,
	discount_type,discount_percent,fixed_discount_minor_units,max_discount_minor_units,
	min_subtotal_minor_units,global_usage_limit,per_client_usage_limit,
	eligible_fulfillment_modes,starts_at::text,ends_at::text,status,
	created_by_actor_id,approved_by_actor_id,approved_at::text,version,
	created_at::text,updated_at::text`

func normalizeCode(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "-", "")
	value = strings.ReplaceAll(value, " ", "")
	return value
}

func HashCode(value string) string {
	sum := sha256.Sum256([]byte(normalizeCode(value)))
	return hex.EncodeToString(sum[:])
}

func validateCode(value string) (string, error) {
	normalized := normalizeCode(value)
	if len(normalized) < 6 || len(normalized) > 32 {
		return "", fmt.Errorf("%w: coupon code must contain 6-32 characters", ErrInvalid)
	}
	for _, r := range normalized {
		if (r < 'A' || r > 'Z') && (r < '0' || r > '9') {
			return "", fmt.Errorf("%w: coupon code must be alphanumeric", ErrInvalid)
		}
	}
	return normalized, nil
}

func validateTerms(discountType string, percent float64, fixed, maxDiscount, minSubtotal int64, globalLimit, clientLimit int, modes []string) error {
	if discountType != "percent" && discountType != "fixed" {
		return ErrInvalid
	}
	if discountType == "percent" && (percent <= 0 || percent > 100 || fixed != 0) {
		return ErrInvalid
	}
	if discountType == "fixed" && (fixed <= 0 || percent != 0) {
		return ErrInvalid
	}
	if maxDiscount < 0 || minSubtotal < 0 || globalLimit < 0 || clientLimit <= 0 || len(modes) == 0 {
		return ErrInvalid
	}
	allowed := map[string]bool{"bthwani_delivery": true, "partner_delivery": true, "pickup": true}
	for _, mode := range modes {
		if !allowed[mode] {
			return ErrInvalid
		}
	}
	return nil
}

func nullableString(value sql.NullString) *string {
	if !value.Valid || value.String == "" {
		return nil
	}
	result := value.String
	return &result
}

func scanCoupon(row interface{ Scan(dest ...any) error }) (Coupon, error) {
	var coupon Coupon
	var storeID, startsAt, endsAt, approvedAt sql.NullString
	var modes pq.StringArray
	err := row.Scan(
		&coupon.ID, &coupon.NameAr, &coupon.Description, &coupon.CodeLast4, &storeID,
		&coupon.DiscountType, &coupon.DiscountPercent, &coupon.FixedDiscountMinorUnits,
		&coupon.MaxDiscountMinorUnits, &coupon.MinSubtotalMinorUnits,
		&coupon.GlobalUsageLimit, &coupon.PerClientUsageLimit, &modes,
		&startsAt, &endsAt, &coupon.Status, &coupon.CreatedByActorID,
		&coupon.ApprovedByActorID, &approvedAt, &coupon.Version,
		&coupon.CreatedAt, &coupon.UpdatedAt,
	)
	coupon.StoreID = nullableString(storeID)
	coupon.StartsAt = nullableString(startsAt)
	coupon.EndsAt = nullableString(endsAt)
	coupon.ApprovedAt = nullableString(approvedAt)
	coupon.EligibleFulfillmentModes = []string(modes)
	return coupon, err
}

func ReserveTx(ctx context.Context, tx *sql.Tx, input ReserveInput) (*Reservation, error) {
	return ReservePricedTx(ctx, tx, ReservePricedInput{
		Code:                  input.Code,
		ClientActorID:         input.ClientActorID,
		CartID:                input.CartID,
		CheckoutIntentID:      input.CheckoutIntentID,
		StoreID:               input.StoreID,
		FulfillmentMode:       input.FulfillmentMode,
		SubtotalMinorUnits:    input.SubtotalMinorUnits,
		DeliveryFeeMinorUnits: 0,
		Currency:              input.Currency,
	})
}

func ReleaseByIntentTx(ctx context.Context, tx *sql.Tx, intentID, reason string) error {
	_, err := tx.ExecContext(ctx, `UPDATE dsh_coupon_redemptions SET status='released',released_at=NOW(),
		release_reason=$2,updated_at=NOW() WHERE checkout_intent_id=$1::uuid AND status='reserved'`, intentID, reason)
	return err
}

func ReleaseByIntent(db *sql.DB, intentID, reason string) error {
	_, err := db.Exec(`UPDATE dsh_coupon_redemptions SET status='released',released_at=NOW(),
		release_reason=$2,updated_at=NOW() WHERE checkout_intent_id=$1::uuid AND status='reserved'`, intentID, reason)
	return err
}

func CommitByIntentTx(ctx context.Context, tx *sql.Tx, intentID, orderID string) error {
	result, err := tx.ExecContext(ctx, `UPDATE dsh_coupon_redemptions SET status='committed',order_id=$2::uuid,
		committed_at=NOW(),updated_at=NOW() WHERE checkout_intent_id=$1::uuid AND status='reserved' AND reserved_until>NOW()`, intentID, orderID)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	var couponID sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT coupon_id::text FROM dsh_checkout_intents WHERE id=$1::uuid`, intentID).Scan(&couponID); err != nil {
		return err
	}
	if couponID.Valid && couponID.String != "" && affected != 1 {
		return fmt.Errorf("%w: coupon reservation is missing or expired", ErrNotEligible)
	}
	return nil
}

func ReverseByOrderTx(ctx context.Context, tx *sql.Tx, orderID, reason string) error {
	_, err := tx.ExecContext(ctx, `UPDATE dsh_coupon_redemptions SET status='reversed',reversed_at=NOW(),
		release_reason=$2,updated_at=NOW() WHERE order_id=$1::uuid AND status='committed'`, orderID, reason)
	return err
}
