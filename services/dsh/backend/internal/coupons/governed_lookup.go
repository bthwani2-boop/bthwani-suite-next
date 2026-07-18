package coupons

import (
	"database/sql"
	"errors"
)

// ErrFundingPolicy identifies invalid commercial funding ownership or shares.
// Funding-policy validation may wrap or map this to ErrInvalid at API edges.
var ErrFundingPolicy = errors.New("coupon funding policy is invalid")

// GetGoverned returns the coupon and its persisted funding policy from one row.
func GetGoverned(db *sql.DB, couponID string) (GovernedCoupon, error) {
	coupon, err := scanGovernedCoupon(db.QueryRow(`SELECT `+governedCouponSelectColumns+`
		FROM dsh_coupons WHERE id::text=$1 AND archived_at IS NULL`, couponID))
	if errors.Is(err, sql.ErrNoRows) {
		return GovernedCoupon{}, ErrNotFound
	}
	return coupon, err
}
