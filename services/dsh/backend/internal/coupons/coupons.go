package coupons

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
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

func List(db *sql.DB) ([]Coupon, error) {
	rows, err := db.Query(`SELECT ` + couponSelectColumns + ` FROM dsh_coupons WHERE archived_at IS NULL ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []Coupon{}
	for rows.Next() {
		coupon, err := scanCoupon(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, coupon)
	}
	return result, rows.Err()
}

func Get(db *sql.DB, id string) (Coupon, error) {
	coupon, err := scanCoupon(db.QueryRow(`SELECT `+couponSelectColumns+` FROM dsh_coupons WHERE id::text=$1 AND archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Coupon{}, ErrNotFound
	}
	return coupon, err
}

func Create(db *sql.DB, input CreateInput) (IssuedCoupon, error) {
	code, err := validateCode(input.Code)
	if err != nil {
		return IssuedCoupon{}, err
	}
	if strings.TrimSpace(input.NameAr) == "" || strings.TrimSpace(input.ActorID) == "" {
		return IssuedCoupon{}, ErrInvalid
	}
	if len(input.EligibleFulfillmentModes) == 0 {
		input.EligibleFulfillmentModes = []string{"bthwani_delivery", "partner_delivery", "pickup"}
	}
	if input.PerClientUsageLimit == 0 {
		input.PerClientUsageLimit = 1
	}
	if err := validateTerms(input.DiscountType, input.DiscountPercent, input.FixedDiscountMinorUnits, input.MaxDiscountMinorUnits, input.MinSubtotalMinorUnits, input.GlobalUsageLimit, input.PerClientUsageLimit, input.EligibleFulfillmentModes); err != nil {
		return IssuedCoupon{}, err
	}
	if input.EndsAt != nil && input.StartsAt != nil && !input.EndsAt.After(*input.StartsAt) {
		return IssuedCoupon{}, ErrInvalid
	}
	coupon, err := scanCoupon(db.QueryRow(`
		INSERT INTO dsh_coupons
			(name_ar,description,code_hash,code_last4,store_id,discount_type,
			discount_percent,fixed_discount_minor_units,max_discount_minor_units,
			min_subtotal_minor_units,global_usage_limit,per_client_usage_limit,
			eligible_fulfillment_modes,starts_at,ends_at,created_by_actor_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING `+couponSelectColumns,
		strings.TrimSpace(input.NameAr), strings.TrimSpace(input.Description), HashCode(code), code[len(code)-4:],
		input.StoreID, input.DiscountType, input.DiscountPercent, input.FixedDiscountMinorUnits,
		input.MaxDiscountMinorUnits, input.MinSubtotalMinorUnits, input.GlobalUsageLimit,
		input.PerClientUsageLimit, pq.Array(input.EligibleFulfillmentModes), input.StartsAt, input.EndsAt, input.ActorID))
	if err != nil {
		return IssuedCoupon{}, err
	}
	return IssuedCoupon{Coupon: coupon, Code: code}, nil
}

func Update(db *sql.DB, id string, input UpdateInput) (Coupon, error) {
	current, err := Get(db, id)
	if err != nil {
		return Coupon{}, err
	}
	if input.ExpectedVersion <= 0 || input.ExpectedVersion != current.Version {
		return Coupon{}, ErrVersionConflict
	}
	next := current
	if input.NameAr != nil {
		next.NameAr = strings.TrimSpace(*input.NameAr)
	}
	if input.Description != nil {
		next.Description = strings.TrimSpace(*input.Description)
	}
	if input.StoreID != nil {
		next.StoreID = *input.StoreID
	}
	if input.DiscountType != nil {
		next.DiscountType = *input.DiscountType
	}
	if input.DiscountPercent != nil {
		next.DiscountPercent = *input.DiscountPercent
	}
	if input.FixedDiscountMinorUnits != nil {
		next.FixedDiscountMinorUnits = *input.FixedDiscountMinorUnits
	}
	if input.MaxDiscountMinorUnits != nil {
		next.MaxDiscountMinorUnits = *input.MaxDiscountMinorUnits
	}
	if input.MinSubtotalMinorUnits != nil {
		next.MinSubtotalMinorUnits = *input.MinSubtotalMinorUnits
	}
	if input.GlobalUsageLimit != nil {
		next.GlobalUsageLimit = *input.GlobalUsageLimit
	}
	if input.PerClientUsageLimit != nil {
		next.PerClientUsageLimit = *input.PerClientUsageLimit
	}
	if input.EligibleFulfillmentModes != nil {
		next.EligibleFulfillmentModes = *input.EligibleFulfillmentModes
	}
	if input.Status != nil {
		next.Status = *input.Status
	}
	if strings.TrimSpace(next.NameAr) == "" {
		return Coupon{}, ErrInvalid
	}
	if err := validateTerms(next.DiscountType, next.DiscountPercent, next.FixedDiscountMinorUnits, next.MaxDiscountMinorUnits, next.MinSubtotalMinorUnits, next.GlobalUsageLimit, next.PerClientUsageLimit, next.EligibleFulfillmentModes); err != nil {
		return Coupon{}, err
	}
	var startsAt, endsAt any = current.StartsAt, current.EndsAt
	if input.StartsAt != nil {
		startsAt = *input.StartsAt
	}
	if input.EndsAt != nil {
		endsAt = *input.EndsAt
	}
	approvedBy := current.ApprovedByActorID
	var approvedAt any = current.ApprovedAt
	var archivedAt any
	if next.Status == "active" {
		approvedBy = input.ActorID
		approvedAt = time.Now().UTC()
	}
	if next.Status == "archived" {
		archivedAt = time.Now().UTC()
	}
	coupon, err := scanCoupon(db.QueryRow(`
		UPDATE dsh_coupons SET
			name_ar=$2,description=$3,store_id=$4,discount_type=$5,
			discount_percent=$6,fixed_discount_minor_units=$7,max_discount_minor_units=$8,
			min_subtotal_minor_units=$9,global_usage_limit=$10,per_client_usage_limit=$11,
			eligible_fulfillment_modes=$12,starts_at=$13,ends_at=$14,status=$15,
			approved_by_actor_id=$16,approved_at=$17,archived_at=$18,
			version=version+1,updated_at=NOW()
		WHERE id::text=$1 AND version=$19 AND archived_at IS NULL
		RETURNING `+couponSelectColumns,
		id, next.NameAr, next.Description, next.StoreID, next.DiscountType,
		next.DiscountPercent, next.FixedDiscountMinorUnits, next.MaxDiscountMinorUnits,
		next.MinSubtotalMinorUnits, next.GlobalUsageLimit, next.PerClientUsageLimit,
		pq.Array(next.EligibleFulfillmentModes), startsAt, endsAt, next.Status,
		approvedBy, approvedAt, archivedAt, input.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return Coupon{}, ErrVersionConflict
	}
	return coupon, err
}

func ReserveTx(ctx context.Context, tx *sql.Tx, input ReserveInput) (*Reservation, error) {
	if strings.TrimSpace(input.Code) == "" {
		return nil, nil
	}
	if input.ClientActorID == "" || input.CartID == "" || input.CheckoutIntentID == "" || input.StoreID == "" || input.SubtotalMinorUnits <= 1 {
		return nil, ErrInvalid
	}
	if input.Currency == "" {
		input.Currency = "YER"
	}
	code, err := validateCode(input.Code)
	if err != nil {
		return nil, err
	}
	var coupon Coupon
	var storeID, startsAt, endsAt, approvedAt sql.NullString
	var modes pq.StringArray
	err = tx.QueryRowContext(ctx, `SELECT `+couponSelectColumns+` FROM dsh_coupons
		WHERE code_hash=$1 AND archived_at IS NULL FOR UPDATE`, HashCode(code)).Scan(
		&coupon.ID, &coupon.NameAr, &coupon.Description, &coupon.CodeLast4, &storeID,
		&coupon.DiscountType, &coupon.DiscountPercent, &coupon.FixedDiscountMinorUnits,
		&coupon.MaxDiscountMinorUnits, &coupon.MinSubtotalMinorUnits,
		&coupon.GlobalUsageLimit, &coupon.PerClientUsageLimit, &modes,
		&startsAt, &endsAt, &coupon.Status, &coupon.CreatedByActorID,
		&coupon.ApprovedByActorID, &approvedAt, &coupon.Version,
		&coupon.CreatedAt, &coupon.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	coupon.StoreID = nullableString(storeID)
	coupon.StartsAt = nullableString(startsAt)
	coupon.EndsAt = nullableString(endsAt)
	coupon.ApprovedAt = nullableString(approvedAt)
	coupon.EligibleFulfillmentModes = []string(modes)
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
		FROM dsh_coupon_redemptions WHERE coupon_id=$1::uuid`, coupon.ID, input.ClientActorID).Scan(&globalUsed, &clientUsed); err != nil {
		return nil, err
	}
	if (coupon.GlobalUsageLimit > 0 && globalUsed >= coupon.GlobalUsageLimit) || clientUsed >= coupon.PerClientUsageLimit {
		return nil, ErrUsageLimit
	}
	var discount int64
	if coupon.DiscountType == "percent" {
		discount = int64(math.Round(float64(input.SubtotalMinorUnits) * coupon.DiscountPercent / 100))
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
	reservation := &Reservation{CouponID: coupon.ID, ClientActorID: input.ClientActorID, CartID: input.CartID,
		CheckoutIntentID: input.CheckoutIntentID, Status: "reserved", SubtotalMinorUnits: input.SubtotalMinorUnits,
		DiscountMinorUnits: discount, TotalMinorUnits: input.SubtotalMinorUnits - discount, Currency: input.Currency,
		CouponCodeLast4: coupon.CodeLast4}
	reservedUntil := now.Add(30 * time.Minute)
	err = tx.QueryRowContext(ctx, `INSERT INTO dsh_coupon_redemptions
		(coupon_id,client_actor_id,cart_id,checkout_intent_id,status,subtotal_minor_units,
		discount_minor_units,total_minor_units,currency,idempotency_key,reserved_until)
		VALUES ($1::uuid,$2,$3::uuid,$4::uuid,'reserved',$5,$6,$7,$8,$9,$10)
		RETURNING id::text,reserved_until::text`, coupon.ID, input.ClientActorID, input.CartID,
		input.CheckoutIntentID, input.SubtotalMinorUnits, discount, reservation.TotalMinorUnits,
		input.Currency, "checkout:"+input.CheckoutIntentID, reservedUntil).Scan(&reservation.ID, &reservation.ReservedUntil)
	if err != nil {
		return nil, err
	}
	return reservation, nil
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
