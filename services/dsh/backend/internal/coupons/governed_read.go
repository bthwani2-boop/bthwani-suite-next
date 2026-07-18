package coupons

import (
	"database/sql"
	"errors"
)

func GetGoverned(db *sql.DB, id string) (GovernedCoupon, error) {
	coupon, err := scanGovernedCoupon(db.QueryRow(`SELECT `+governedCouponSelectColumns+`
		FROM dsh_coupons WHERE id::text=$1 AND archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return GovernedCoupon{}, ErrNotFound
	}
	return coupon, err
}
