package coupons

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var ErrFundingPolicy = errors.New("invalid coupon funding policy")

type FundingProjection struct {
	RedemptionID             string
	CouponID                 string
	CheckoutIntentID         string
	ClientActorID            string
	TenantID                 string
	PartnerID                string
	PlatformFundedMinorUnits int64
	PartnerFundedMinorUnits  int64
	TotalDiscountMinorUnits  int64
	Currency                 string
	WLTReservationID         string
	Status                   string
}

func splitFunding(discount int64, source string, platformShareBps int) (int64, int64, error) {
	if discount <= 0 || platformShareBps < 0 || platformShareBps > 10000 {
		return 0, 0, ErrFundingPolicy
	}
	switch source {
	case "platform":
		if platformShareBps != 10000 {
			return 0, 0, ErrFundingPolicy
		}
		return discount, 0, nil
	case "partner":
		if platformShareBps != 0 {
			return 0, 0, ErrFundingPolicy
		}
		return 0, discount, nil
	case "shared":
		if platformShareBps <= 0 || platformShareBps >= 10000 || discount < 2 {
			return 0, 0, ErrFundingPolicy
		}
		platform := (discount*int64(platformShareBps) + 5000) / 10000
		if platform <= 0 {
			platform = 1
		}
		if platform >= discount {
			platform = discount - 1
		}
		return platform, discount - platform, nil
	default:
		return 0, 0, ErrFundingPolicy
	}
}

func PrepareFundingForIntent(ctx context.Context, db *sql.DB, checkoutIntentID string) (*FundingProjection, error) {
	checkoutIntentID = strings.TrimSpace(checkoutIntentID)
	if db == nil || checkoutIntentID == "" {
		return nil, ErrInvalid
	}

	var projection FundingProjection
	var fundingSource string
	var platformShareBps int
	var configuredPartner, storePartner sql.NullString
	err := db.QueryRowContext(ctx, `
		SELECT r.id::TEXT,r.coupon_id::TEXT,r.checkout_intent_id::TEXT,
		       r.client_actor_id,r.discount_minor_units,r.currency,
		       COALESCE(r.funding_tenant_id,''),r.funding_status,
		       COALESCE(r.wlt_funding_reservation_id,''),
		       c.funding_source,c.platform_share_bps,c.funding_partner_id,
		       s.partner_id
		FROM dsh_coupon_redemptions r
		JOIN dsh_coupons c ON c.id=r.coupon_id
		JOIN dsh_checkout_intents i ON i.id=r.checkout_intent_id
		JOIN dsh_stores s ON s.id=i.store_id
		WHERE r.checkout_intent_id=$1::uuid`, checkoutIntentID).Scan(
		&projection.RedemptionID,
		&projection.CouponID,
		&projection.CheckoutIntentID,
		&projection.ClientActorID,
		&projection.TotalDiscountMinorUnits,
		&projection.Currency,
		&projection.TenantID,
		&projection.Status,
		&projection.WLTReservationID,
		&fundingSource,
		&platformShareBps,
		&configuredPartner,
		&storePartner,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if projection.Status == "reserved" || projection.Status == "committed" ||
		projection.Status == "released" || projection.Status == "reversed" {
		var partner sql.NullString
		err := db.QueryRowContext(ctx, `SELECT platform_funded_minor_units,
			partner_funded_minor_units,funding_partner_id
			FROM dsh_coupon_redemptions WHERE id=$1::uuid`, projection.RedemptionID).
			Scan(&projection.PlatformFundedMinorUnits, &projection.PartnerFundedMinorUnits, &partner)
		if err != nil {
			return nil, err
		}
		if partner.Valid {
			projection.PartnerID = partner.String
		}
		return &projection, nil
	}

	platform, partnerAmount, err := splitFunding(projection.TotalDiscountMinorUnits, fundingSource, platformShareBps)
	if err != nil {
		return nil, err
	}
	if partnerAmount > 0 {
		if !configuredPartner.Valid || strings.TrimSpace(configuredPartner.String) == "" {
			return nil, fmt.Errorf("%w: partner-funded coupon has no partner", ErrFundingPolicy)
		}
		if !storePartner.Valid || storePartner.String != configuredPartner.String {
			return nil, fmt.Errorf("%w: coupon funding partner does not own checkout store", ErrFundingPolicy)
		}
		projection.PartnerID = configuredPartner.String
	}
	projection.PlatformFundedMinorUnits = platform
	projection.PartnerFundedMinorUnits = partnerAmount
	projection.Status = "pending"

	result, err := db.ExecContext(ctx, `UPDATE dsh_coupon_redemptions
		SET platform_funded_minor_units=$2,
		    partner_funded_minor_units=$3,
		    funding_partner_id=NULLIF($4,''),
		    funding_status='pending',
		    funding_failure_code='',
		    funding_updated_at=NOW(),
		    updated_at=NOW()
		WHERE id=$1::uuid AND status='reserved' AND funding_status IN ('not_required','failed')`,
		projection.RedemptionID,
		projection.PlatformFundedMinorUnits,
		projection.PartnerFundedMinorUnits,
		projection.PartnerID,
	)
	if err != nil {
		return nil, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows != 1 {
		return nil, ErrFundingPolicy
	}
	return &projection, nil
}

func AttachWLTReservation(ctx context.Context, db *sql.DB, redemptionID, reservationID, tenantID string) error {
	redemptionID = strings.TrimSpace(redemptionID)
	reservationID = strings.TrimSpace(reservationID)
	tenantID = strings.TrimSpace(tenantID)
	if db == nil || redemptionID == "" || reservationID == "" || tenantID == "" {
		return ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_coupon_redemptions
		SET funding_status='reserved',funding_tenant_id=$3,wlt_funding_reservation_id=$2,
		    funding_failure_code='',funding_updated_at=NOW(),updated_at=NOW()
		WHERE id=$1::uuid AND funding_status='pending'`, redemptionID, reservationID, tenantID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return ErrFundingPolicy
	}
	return nil
}

func MarkFundingFailed(ctx context.Context, db *sql.DB, redemptionID, code string) error {
	if db == nil || strings.TrimSpace(redemptionID) == "" {
		return ErrInvalid
	}
	_, err := db.ExecContext(ctx, `UPDATE dsh_coupon_redemptions
		SET funding_status='failed',funding_failure_code=$2,
		    funding_updated_at=NOW(),updated_at=NOW()
		WHERE id=$1::uuid AND funding_status IN ('pending','reserved')`,
		strings.TrimSpace(redemptionID), strings.TrimSpace(code))
	return err
}

func MarkFundingProjection(ctx context.Context, db *sql.DB, reservationID, status string) error {
	if db == nil || strings.TrimSpace(reservationID) == "" {
		return ErrInvalid
	}
	allowed := map[string]bool{"committed": true, "released": true, "reversed": true}
	if !allowed[status] {
		return ErrInvalid
	}
	result, err := db.ExecContext(ctx, `UPDATE dsh_coupon_redemptions
		SET funding_status=$2,funding_failure_code='',funding_updated_at=NOW(),updated_at=NOW()
		WHERE wlt_funding_reservation_id=$1 AND funding_status<>$2`,
		strings.TrimSpace(reservationID), status)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		var current string
		if err := db.QueryRowContext(ctx, `SELECT funding_status FROM dsh_coupon_redemptions
			WHERE wlt_funding_reservation_id=$1`, strings.TrimSpace(reservationID)).Scan(&current); err != nil {
			return err
		}
		if current != status {
			return ErrFundingPolicy
		}
	}
	return nil
}

func FundingByIntent(ctx context.Context, db *sql.DB, checkoutIntentID string) (*FundingProjection, error) {
	var projection FundingProjection
	var partner sql.NullString
	err := db.QueryRowContext(ctx, `SELECT id::TEXT,coupon_id::TEXT,checkout_intent_id::TEXT,
		client_actor_id,COALESCE(funding_tenant_id,''),funding_partner_id,
		platform_funded_minor_units,partner_funded_minor_units,
		discount_minor_units,currency,COALESCE(wlt_funding_reservation_id,''),funding_status
		FROM dsh_coupon_redemptions WHERE checkout_intent_id=$1::uuid`, checkoutIntentID).Scan(
		&projection.RedemptionID,
		&projection.CouponID,
		&projection.CheckoutIntentID,
		&projection.ClientActorID,
		&projection.TenantID,
		&partner,
		&projection.PlatformFundedMinorUnits,
		&projection.PartnerFundedMinorUnits,
		&projection.TotalDiscountMinorUnits,
		&projection.Currency,
		&projection.WLTReservationID,
		&projection.Status,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if partner.Valid {
		projection.PartnerID = partner.String
	}
	return &projection, nil
}
