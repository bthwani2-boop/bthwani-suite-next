package coupons

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/lib/pq"
)

var ErrConflict = errors.New("coupon state conflict")

type GovernedCoupon struct {
	Coupon
	FundingSource    string  `json:"fundingSource"`
	PlatformShareBPS int     `json:"platformShareBps"`
	FundingPartnerID *string `json:"fundingPartnerId,omitempty"`
}

type IssuedGovernedCoupon struct {
	Coupon GovernedCoupon `json:"coupon"`
	Code   string         `json:"code"`
}

type GovernedCreateInput struct {
	CreateInput
	FundingSource    string
	PlatformShareBPS int
	FundingPartnerID *string
}

type GovernedUpdateInput struct {
	UpdateInput
	FundingSource    *string
	PlatformShareBPS *int
	FundingPartnerID **string
}

const governedCouponSelectColumns = couponSelectColumns + `,
	funding_source,platform_share_bps,funding_partner_id`

func scanGovernedCoupon(row interface{ Scan(dest ...any) error }) (GovernedCoupon, error) {
	var governed GovernedCoupon
	var storeID, startsAt, endsAt, approvedAt, fundingPartnerID sql.NullString
	var modes pq.StringArray
	err := row.Scan(
		&governed.ID, &governed.NameAr, &governed.Description, &governed.CodeLast4, &storeID,
		&governed.DiscountType, &governed.DiscountPercent, &governed.FixedDiscountMinorUnits,
		&governed.MaxDiscountMinorUnits, &governed.MinSubtotalMinorUnits,
		&governed.GlobalUsageLimit, &governed.PerClientUsageLimit, &modes,
		&startsAt, &endsAt, &governed.Status, &governed.CreatedByActorID,
		&governed.ApprovedByActorID, &approvedAt, &governed.Version,
		&governed.CreatedAt, &governed.UpdatedAt,
		&governed.FundingSource, &governed.PlatformShareBPS, &fundingPartnerID,
	)
	if err != nil {
		return GovernedCoupon{}, err
	}
	governed.StoreID = nullableString(storeID)
	governed.StartsAt = nullableString(startsAt)
	governed.EndsAt = nullableString(endsAt)
	governed.ApprovedAt = nullableString(approvedAt)
	governed.EligibleFulfillmentModes = []string(modes)
	governed.FundingPartnerID = nullableString(fundingPartnerID)
	return governed, nil
}

func ListGoverned(db *sql.DB) ([]GovernedCoupon, error) {
	rows, err := db.Query(`SELECT ` + governedCouponSelectColumns + `
		FROM dsh_coupons WHERE archived_at IS NULL ORDER BY created_at DESC`)
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
	if db == nil {
		return IssuedGovernedCoupon{}, ErrInvalid
	}
	code, err := validateCode(input.Code)
	if err != nil {
		return IssuedGovernedCoupon{}, err
	}
	input.NameAr = strings.TrimSpace(input.NameAr)
	input.ActorID = strings.TrimSpace(input.ActorID)
	if input.NameAr == "" || input.ActorID == "" {
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

	policyInput := normalizeFundingPolicy(UpdateFundingPolicyInput{
		FundingSource: input.FundingSource, PlatformShareBPS: input.PlatformShareBPS,
		FundingPartnerID: input.FundingPartnerID, ExpectedVersion: 1,
	})
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return IssuedGovernedCoupon{}, err
	}
	defer func() { _ = tx.Rollback() }()
	if err := validateFundingPolicyInput(ctx, tx, input.StoreID, policyInput); err != nil {
		return IssuedGovernedCoupon{}, err
	}

	coupon, err := scanGovernedCoupon(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_coupons
			(name_ar,description,code_hash,code_last4,store_id,discount_type,
			discount_percent,fixed_discount_minor_units,max_discount_minor_units,
			min_subtotal_minor_units,global_usage_limit,per_client_usage_limit,
			eligible_fulfillment_modes,starts_at,ends_at,created_by_actor_id,
			funding_source,platform_share_bps,funding_partner_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING `+governedCouponSelectColumns,
		input.NameAr, strings.TrimSpace(input.Description), HashCode(code), code[len(code)-4:],
		input.StoreID, input.DiscountType, input.DiscountPercent, input.FixedDiscountMinorUnits,
		input.MaxDiscountMinorUnits, input.MinSubtotalMinorUnits, input.GlobalUsageLimit,
		input.PerClientUsageLimit, pq.Array(input.EligibleFulfillmentModes), input.StartsAt, input.EndsAt,
		input.ActorID, policyInput.FundingSource, policyInput.PlatformShareBPS, policyInput.FundingPartnerID))
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
	id = strings.TrimSpace(id)
	if db == nil || id == "" || input.ExpectedVersion <= 0 {
		return GovernedCoupon{}, ErrInvalid
	}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return GovernedCoupon{}, err
	}
	defer func() { _ = tx.Rollback() }()
	current, err := getGovernedForUpdate(ctx, tx, id)
	if err != nil {
		return GovernedCoupon{}, err
	}
	if current.Version != input.ExpectedVersion {
		return GovernedCoupon{}, ErrVersionConflict
	}

	baseTermsChanged := input.NameAr != nil || input.Description != nil || input.StoreID != nil || input.DiscountType != nil || input.DiscountPercent != nil || input.FixedDiscountMinorUnits != nil || input.MaxDiscountMinorUnits != nil || input.MinSubtotalMinorUnits != nil || input.GlobalUsageLimit != nil || input.PerClientUsageLimit != nil || input.EligibleFulfillmentModes != nil || input.StartsAt != nil || input.EndsAt != nil
	fundingChanged := input.FundingSource != nil || input.PlatformShareBPS != nil || input.FundingPartnerID != nil
	if current.Status == "active" && (baseTermsChanged || fundingChanged) {
		return GovernedCoupon{}, ErrConflict
	}
	if input.Status != nil && strings.TrimSpace(*input.Status) == "active" && current.CreatedByActorID == strings.TrimSpace(input.ActorID) {
		return GovernedCoupon{}, ErrConflict
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
	if input.Status != nil { next.Status = strings.TrimSpace(*input.Status) }
	if next.NameAr == "" {
		return GovernedCoupon{}, ErrInvalid
	}
	allowedStatus := map[string]bool{"draft": true, "active": true, "paused": true, "archived": true}
	if !allowedStatus[next.Status] {
		return GovernedCoupon{}, ErrInvalid
	}
	if err := validateTerms(next.DiscountType, next.DiscountPercent, next.FixedDiscountMinorUnits, next.MaxDiscountMinorUnits, next.MinSubtotalMinorUnits, next.GlobalUsageLimit, next.PerClientUsageLimit, next.EligibleFulfillmentModes); err != nil {
		return GovernedCoupon{}, err
	}
	startsAt, startTime, err := governedCouponTime(current.StartsAt, input.StartsAt)
	if err != nil { return GovernedCoupon{}, err }
	endsAt, endTime, err := governedCouponTime(current.EndsAt, input.EndsAt)
	if err != nil { return GovernedCoupon{}, err }
	if startTime != nil && endTime != nil && !endTime.After(*startTime) {
		return GovernedCoupon{}, ErrInvalid
	}

	policyInput := UpdateFundingPolicyInput{FundingSource: current.FundingSource, PlatformShareBPS: current.PlatformShareBPS, FundingPartnerID: current.FundingPartnerID, ExpectedVersion: input.ExpectedVersion}
	if input.FundingSource != nil { policyInput.FundingSource = *input.FundingSource }
	if input.PlatformShareBPS != nil { policyInput.PlatformShareBPS = *input.PlatformShareBPS }
	if input.FundingPartnerID != nil { policyInput.FundingPartnerID = *input.FundingPartnerID }
	policyInput = normalizeFundingPolicy(policyInput)
	if err := validateFundingPolicyInput(ctx, tx, next.StoreID, policyInput); err != nil {
		return GovernedCoupon{}, err
	}

	approvedBy := current.ApprovedByActorID
	var approvedAt any
	if current.ApprovedAt != nil { approvedAt = *current.ApprovedAt }
	var archivedAt any
	if next.Status == "active" {
		if strings.TrimSpace(input.ActorID) == "" { return GovernedCoupon{}, ErrInvalid }
		approvedBy = strings.TrimSpace(input.ActorID)
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
		approvedBy, approvedAt, archivedAt, policyInput.FundingSource,
		policyInput.PlatformShareBPS, policyInput.FundingPartnerID, input.ExpectedVersion))
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

func governedCouponTime(current *string, update **time.Time) (any, *time.Time, error) {
	if update != nil {
		if *update == nil { return nil, nil, nil }
		value := **update
		return value, &value, nil
	}
	if current == nil || strings.TrimSpace(*current) == "" { return nil, nil, nil }
	parsed, err := time.Parse(time.RFC3339, *current)
	if err != nil { return nil, nil, ErrInvalid }
	return parsed, &parsed, nil
}
