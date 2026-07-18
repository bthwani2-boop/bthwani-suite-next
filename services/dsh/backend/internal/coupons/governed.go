package coupons

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
)

type GovernedCoupon struct {
	Coupon
	FundingSource    string  `json:"fundingSource"`
	PlatformShareBps int     `json:"platformShareBps"`
	PartnerShareBps  int     `json:"partnerShareBps"`
	SponsorID         *string `json:"sponsorId,omitempty"`
}

type IssuedGovernedCoupon struct {
	Coupon GovernedCoupon `json:"coupon"`
	Code   string         `json:"code"`
}

type GovernedCreateInput struct {
	CreateInput
	FundingSource     string
	PlatformShareBps int
	PartnerShareBps  int
	SponsorID          *string
}

type GovernedUpdateInput struct {
	UpdateInput
	FundingSource     *string
	PlatformShareBps *int
	PartnerShareBps  *int
	SponsorID          **string
}

const governedCouponSelectColumns = couponSelectColumns + `,
	funding_source,platform_share_bps,funding_partner_id`

func validateFunding(source string, platformShareBps, partnerShareBps int, sponsorID *string) (string, int, int, *string, error) {
	source = strings.TrimSpace(source)
	if sponsorID != nil {
		trimmed := strings.TrimSpace(*sponsorID)
		if trimmed == "" {
			sponsorID = nil
		} else {
			sponsorID = &trimmed
		}
	}
	if platformShareBps < 0 || platformShareBps > 10000 || partnerShareBps < 0 || partnerShareBps > 10000 || platformShareBps+partnerShareBps != 10000 {
		return "", 0, 0, nil, ErrFundingPolicy
	}
	switch source {
	case "platform":
		if platformShareBps != 10000 || partnerShareBps != 0 {
			return "", 0, 0, nil, ErrFundingPolicy
		}
		sponsorID = nil
	case "partner":
		if platformShareBps != 0 || partnerShareBps != 10000 || sponsorID == nil {
			return "", 0, 0, nil, ErrFundingPolicy
		}
	case "shared":
		if platformShareBps <= 0 || platformShareBps >= 10000 || partnerShareBps <= 0 || sponsorID == nil {
			return "", 0, 0, nil, ErrFundingPolicy
		}
	default:
		return "", 0, 0, nil, ErrFundingPolicy
	}
	return source, platformShareBps, partnerShareBps, sponsorID, nil
}

func scanGovernedCoupon(row interface{ Scan(dest ...any) error }) (GovernedCoupon, error) {
	var governed GovernedCoupon
	var storeID, startsAt, endsAt, approvedAt, sponsorID sql.NullString
	var modes pq.StringArray
	var fundingSource string
	var platformShareBps int
	err := row.Scan(
		&governed.ID, &governed.NameAr, &governed.Description, &governed.CodeLast4, &storeID,
		&governed.DiscountType, &governed.DiscountPercent, &governed.FixedDiscountMinorUnits,
		&governed.MaxDiscountMinorUnits, &governed.MinSubtotalMinorUnits,
		&governed.GlobalUsageLimit, &governed.PerClientUsageLimit, &modes,
		&startsAt, &endsAt, &governed.Status, &governed.CreatedByActorID,
		&governed.ApprovedByActorID, &approvedAt, &governed.Version,
		&governed.CreatedAt, &governed.UpdatedAt,
		&fundingSource, &platformShareBps, &sponsorID,
	)
	if err != nil {
		return GovernedCoupon{}, err
	}
	governed.StoreID = nullableString(storeID)
	governed.StartsAt = nullableString(startsAt)
	governed.EndsAt = nullableString(endsAt)
	governed.ApprovedAt = nullableString(approvedAt)
	governed.EligibleFulfillmentModes = []string(modes)
	governed.FundingSource = fundingSource
	governed.PlatformShareBps = platformShareBps
	governed.PartnerShareBps = 10000 - platformShareBps
	governed.SponsorID = nullableString(sponsorID)
	return governed, nil
}

func ListGoverned(db *sql.DB) ([]GovernedCoupon, error) {
	rows, err := db.Query(`SELECT ` + governedCouponSelectColumns + ` FROM dsh_coupons WHERE archived_at IS NULL ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]GovernedCoupon, 0)
	for rows.Next() {
		coupon, scanErr := scanGovernedCoupon(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, coupon)
	}
	return result, rows.Err()
}

func CreateGoverned(ctx context.Context, db *sql.DB, input GovernedCreateInput) (IssuedGovernedCoupon, error) {
	code, err := validateCode(input.Code)
	if err != nil {
		return IssuedGovernedCoupon{}, err
	}
	if strings.TrimSpace(input.NameAr) == "" || strings.TrimSpace(input.ActorID) == "" {
		return IssuedGovernedCoupon{}, ErrInvalid
	}
	if len(input.EligibleFulfillmentModes) == 0 {
		input.EligibleFulfillmentModes = []string{"bthwani_delivery", "partner_delivery", "pickup"}
	}
	if input.PerClientUsageLimit == 0 {
		input.PerClientUsageLimit = 1
	}
	if err := validateTerms(input.DiscountType, input.DiscountPercent, input.FixedDiscountMinorUnits, input.MaxDiscountMinorUnits, input.MinSubtotalMinorUnits, input.GlobalUsageLimit, input.PerClientUsageLimit, input.EligibleFulfillmentModes); err != nil {
		return IssuedGovernedCoupon{}, err
	}
	if input.EndsAt != nil && input.StartsAt != nil && !input.EndsAt.After(*input.StartsAt) {
		return IssuedGovernedCoupon{}, ErrInvalid
	}
	fundingSource, platformShare, _, sponsorID, err := validateFunding(input.FundingSource, input.PlatformShareBps, input.PartnerShareBps, input.SponsorID)
	if err != nil {
		return IssuedGovernedCoupon{}, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return IssuedGovernedCoupon{}, err
	}
	defer tx.Rollback()
	coupon, err := scanGovernedCoupon(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_coupons
			(name_ar,description,code_hash,code_last4,store_id,discount_type,
			discount_percent,fixed_discount_minor_units,max_discount_minor_units,
			min_subtotal_minor_units,global_usage_limit,per_client_usage_limit,
			eligible_fulfillment_modes,starts_at,ends_at,created_by_actor_id,
			funding_source,platform_share_bps,funding_partner_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING `+governedCouponSelectColumns,
		strings.TrimSpace(input.NameAr), strings.TrimSpace(input.Description), HashCode(code), code[len(code)-4:],
		input.StoreID, input.DiscountType, input.DiscountPercent, input.FixedDiscountMinorUnits,
		input.MaxDiscountMinorUnits, input.MinSubtotalMinorUnits, input.GlobalUsageLimit,
		input.PerClientUsageLimit, pq.Array(input.EligibleFulfillmentModes), input.StartsAt, input.EndsAt, input.ActorID,
		fundingSource, platformShare, sponsorID))
	if err != nil {
		return IssuedGovernedCoupon{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssuedGovernedCoupon{}, err
	}
	return IssuedGovernedCoupon{Coupon: coupon, Code: code}, nil
}

func getGovernedForUpdate(ctx context.Context, tx *sql.Tx, id string) (GovernedCoupon, error) {
	coupon, err := scanGovernedCoupon(tx.QueryRowContext(ctx, `SELECT `+governedCouponSelectColumns+`
		FROM dsh_coupons WHERE id::text=$1 AND archived_at IS NULL FOR UPDATE`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return GovernedCoupon{}, ErrNotFound
	}
	return coupon, err
}

func UpdateGoverned(ctx context.Context, db *sql.DB, id string, input GovernedUpdateInput) (GovernedCoupon, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return GovernedCoupon{}, err
	}
	defer tx.Rollback()
	current, err := getGovernedForUpdate(ctx, tx, id)
	if err != nil {
		return GovernedCoupon{}, err
	}
	if input.ExpectedVersion <= 0 || input.ExpectedVersion != current.Version {
		return GovernedCoupon{}, ErrVersionConflict
	}
	next := current
	if input.NameAr != nil { next.NameAr = strings.TrimSpace(*input.NameAr) }
	if input.Description != nil { next.Description = strings.TrimSpace(*input.Description) }
	if input.StoreID != nil { next.StoreID = *input.StoreID }
	if input.DiscountType != nil { next.DiscountType = *input.DiscountType }
	if input.DiscountPercent != nil { next.DiscountPercent = *input.DiscountPercent }
	if input.FixedDiscountMinorUnits != nil { next.FixedDiscountMinorUnits = *input.FixedDiscountMinorUnits }
	if input.MaxDiscountMinorUnits != nil { next.MaxDiscountMinorUnits = *input.MaxDiscountMinorUnits }
	if input.MinSubtotalMinorUnits != nil { next.MinSubtotalMinorUnits = *input.MinSubtotalMinorUnits }
	if input.GlobalUsageLimit != nil { next.GlobalUsageLimit = *input.GlobalUsageLimit }
	if input.PerClientUsageLimit != nil { next.PerClientUsageLimit = *input.PerClientUsageLimit }
	if input.EligibleFulfillmentModes != nil { next.EligibleFulfillmentModes = *input.EligibleFulfillmentModes }
	if input.Status != nil { next.Status = *input.Status }
	if input.FundingSource != nil { next.FundingSource = strings.TrimSpace(*input.FundingSource) }
	if input.PlatformShareBps != nil { next.PlatformShareBps = *input.PlatformShareBps }
	if input.PartnerShareBps != nil { next.PartnerShareBps = *input.PartnerShareBps }
	if input.SponsorID != nil { next.SponsorID = *input.SponsorID }
	if strings.TrimSpace(next.NameAr) == "" || strings.TrimSpace(input.ActorID) == "" {
		return GovernedCoupon{}, ErrInvalid
	}
	if err := validateTerms(next.DiscountType, next.DiscountPercent, next.FixedDiscountMinorUnits, next.MaxDiscountMinorUnits, next.MinSubtotalMinorUnits, next.GlobalUsageLimit, next.PerClientUsageLimit, next.EligibleFulfillmentModes); err != nil {
		return GovernedCoupon{}, err
	}
	fundingSource, platformShare, partnerShare, sponsorID, err := validateFunding(next.FundingSource, next.PlatformShareBps, next.PartnerShareBps, next.SponsorID)
	if err != nil {
		return GovernedCoupon{}, err
	}
	next.FundingSource, next.PlatformShareBps, next.PartnerShareBps, next.SponsorID = fundingSource, platformShare, partnerShare, sponsorID

	var startsAt, endsAt any = current.StartsAt, current.EndsAt
	if input.StartsAt != nil { startsAt = *input.StartsAt }
	if input.EndsAt != nil { endsAt = *input.EndsAt }
	approvedBy := current.ApprovedByActorID
	var approvedAt any = current.ApprovedAt
	var archivedAt any
	if next.Status == "active" {
		approvedBy = input.ActorID
		approvedAt = time.Now().UTC()
	}
	if next.Status == "archived" { archivedAt = time.Now().UTC() }

	coupon, err := scanGovernedCoupon(tx.QueryRowContext(ctx, `
		UPDATE dsh_coupons SET
			name_ar=$2,description=$3,store_id=$4,discount_type=$5,
			discount_percent=$6,fixed_discount_minor_units=$7,max_discount_minor_units=$8,
			min_subtotal_minor_units=$9,global_usage_limit=$10,per_client_usage_limit=$11,
			eligible_fulfillment_modes=$12,starts_at=$13,ends_at=$14,status=$15,
			approved_by_actor_id=$16,approved_at=$17,archived_at=$18,
			funding_source=$19,platform_share_bps=$20,funding_partner_id=$21,
			version=version+1,updated_at=NOW()
		WHERE id::text=$1 AND version=$22 AND archived_at IS NULL
		RETURNING `+governedCouponSelectColumns,
		id, next.NameAr, next.Description, next.StoreID, next.DiscountType,
		next.DiscountPercent, next.FixedDiscountMinorUnits, next.MaxDiscountMinorUnits,
		next.MinSubtotalMinorUnits, next.GlobalUsageLimit, next.PerClientUsageLimit,
		pq.Array(next.EligibleFulfillmentModes), startsAt, endsAt, next.Status,
		approvedBy, approvedAt, archivedAt, next.FundingSource, next.PlatformShareBps, next.SponsorID, input.ExpectedVersion))
	if errors.Is(err, sql.ErrNoRows) {
		return GovernedCoupon{}, ErrVersionConflict
	}
	if err != nil {
		return GovernedCoupon{}, err
	}
	if err := tx.Commit(); err != nil {
		return GovernedCoupon{}, err
	}
	return coupon, nil
}
