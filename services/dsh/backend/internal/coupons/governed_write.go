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

func CreateGoverned(ctx context.Context, db *sql.DB, input GovernedCreateInput) (IssuedCoupon, FundingPolicy, error) {
	if db == nil {
		return IssuedCoupon{}, FundingPolicy{}, ErrInvalid
	}
	code, err := validateCode(input.Code)
	if err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}
	input.NameAr = strings.TrimSpace(input.NameAr)
	input.ActorID = strings.TrimSpace(input.ActorID)
	if input.NameAr == "" || input.ActorID == "" {
		return IssuedCoupon{}, FundingPolicy{}, ErrInvalid
	}
	if len(input.EligibleFulfillmentModes) == 0 {
		input.EligibleFulfillmentModes = []string{"bthwani_delivery", "partner_delivery", "pickup"}
	}
	if input.PerClientUsageLimit == 0 {
		input.PerClientUsageLimit = 1
	}
	if err := validateTerms(
		input.DiscountType,
		input.DiscountPercent,
		input.FixedDiscountMinorUnits,
		input.MaxDiscountMinorUnits,
		input.MinSubtotalMinorUnits,
		input.GlobalUsageLimit,
		input.PerClientUsageLimit,
		input.EligibleFulfillmentModes,
	); err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}
	if input.EndsAt != nil && input.StartsAt != nil && !input.EndsAt.After(*input.StartsAt) {
		return IssuedCoupon{}, FundingPolicy{}, ErrInvalid
	}

	policyInput := normalizeFundingPolicy(UpdateFundingPolicyInput{
		FundingSource:    input.FundingSource,
		PlatformShareBPS: input.PlatformShareBPS,
		FundingPartnerID: input.FundingPartnerID,
		ExpectedVersion:  1,
	})

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}
	defer func() { _ = tx.Rollback() }()

	if err := validateFundingPolicyInput(ctx, tx, input.StoreID, policyInput); err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}

	coupon, err := scanCoupon(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_coupons
			(name_ar,description,code_hash,code_last4,store_id,discount_type,
			discount_percent,fixed_discount_minor_units,max_discount_minor_units,
			min_subtotal_minor_units,global_usage_limit,per_client_usage_limit,
			eligible_fulfillment_modes,starts_at,ends_at,created_by_actor_id,
			funding_source,platform_share_bps,funding_partner_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		RETURNING `+couponSelectColumns,
		input.NameAr,
		strings.TrimSpace(input.Description),
		HashCode(code),
		code[len(code)-4:],
		input.StoreID,
		input.DiscountType,
		input.DiscountPercent,
		input.FixedDiscountMinorUnits,
		input.MaxDiscountMinorUnits,
		input.MinSubtotalMinorUnits,
		input.GlobalUsageLimit,
		input.PerClientUsageLimit,
		pq.Array(input.EligibleFulfillmentModes),
		input.StartsAt,
		input.EndsAt,
		input.ActorID,
		policyInput.FundingSource,
		policyInput.PlatformShareBPS,
		policyInput.FundingPartnerID,
	))
	if err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}

	policy, err := scanFundingPolicy(tx.QueryRowContext(ctx, `
		SELECT id::TEXT,funding_source,platform_share_bps,funding_partner_id,version,updated_at::TEXT
		FROM dsh_coupons WHERE id=$1::uuid`, coupon.ID))
	if err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssuedCoupon{}, FundingPolicy{}, err
	}
	return IssuedCoupon{Coupon: coupon, Code: code}, *policy, nil
}

func UpdateGoverned(ctx context.Context, db *sql.DB, id string, input GovernedUpdateInput) (Coupon, FundingPolicy, error) {
	id = strings.TrimSpace(id)
	if db == nil || id == "" || input.ExpectedVersion <= 0 {
		return Coupon{}, FundingPolicy{}, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}
	defer func() { _ = tx.Rollback() }()

	current, err := scanCoupon(tx.QueryRowContext(ctx, `
		SELECT `+couponSelectColumns+` FROM dsh_coupons
		WHERE id::text=$1 AND archived_at IS NULL FOR UPDATE`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Coupon{}, FundingPolicy{}, ErrNotFound
	}
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}
	if current.Version != input.ExpectedVersion {
		return Coupon{}, FundingPolicy{}, ErrVersionConflict
	}

	currentPolicy, err := scanFundingPolicy(tx.QueryRowContext(ctx, `
		SELECT id::TEXT,funding_source,platform_share_bps,funding_partner_id,version,updated_at::TEXT
		FROM dsh_coupons WHERE id=$1::uuid`, current.ID))
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}

	baseTermsChanged := input.NameAr != nil || input.Description != nil || input.StoreID != nil ||
		input.DiscountType != nil || input.DiscountPercent != nil || input.FixedDiscountMinorUnits != nil ||
		input.MaxDiscountMinorUnits != nil || input.MinSubtotalMinorUnits != nil || input.GlobalUsageLimit != nil ||
		input.PerClientUsageLimit != nil || input.EligibleFulfillmentModes != nil || input.StartsAt != nil || input.EndsAt != nil
	fundingChanged := input.FundingSource != nil || input.PlatformShareBPS != nil || input.FundingPartnerID != nil
	if current.Status == "active" && (baseTermsChanged || fundingChanged) {
		return Coupon{}, FundingPolicy{}, ErrConflict
	}
	if input.Status != nil && *input.Status == "active" && current.CreatedByActorID == strings.TrimSpace(input.ActorID) {
		return Coupon{}, FundingPolicy{}, ErrConflict
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
		next.Status = strings.TrimSpace(*input.Status)
	}
	if next.NameAr == "" {
		return Coupon{}, FundingPolicy{}, ErrInvalid
	}
	allowedStatus := map[string]bool{"draft": true, "active": true, "paused": true, "archived": true}
	if !allowedStatus[next.Status] {
		return Coupon{}, FundingPolicy{}, ErrInvalid
	}
	if err := validateTerms(
		next.DiscountType,
		next.DiscountPercent,
		next.FixedDiscountMinorUnits,
		next.MaxDiscountMinorUnits,
		next.MinSubtotalMinorUnits,
		next.GlobalUsageLimit,
		next.PerClientUsageLimit,
		next.EligibleFulfillmentModes,
	); err != nil {
		return Coupon{}, FundingPolicy{}, err
	}

	startsAt, startTime, err := governedCouponTime(current.StartsAt, input.StartsAt)
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}
	endsAt, endTime, err := governedCouponTime(current.EndsAt, input.EndsAt)
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}
	if startTime != nil && endTime != nil && !endTime.After(*startTime) {
		return Coupon{}, FundingPolicy{}, ErrInvalid
	}

	policyInput := UpdateFundingPolicyInput{
		FundingSource:    currentPolicy.FundingSource,
		PlatformShareBPS: currentPolicy.PlatformShareBPS,
		FundingPartnerID: currentPolicy.FundingPartnerID,
		ExpectedVersion:  input.ExpectedVersion,
	}
	if input.FundingSource != nil {
		policyInput.FundingSource = *input.FundingSource
	}
	if input.PlatformShareBPS != nil {
		policyInput.PlatformShareBPS = *input.PlatformShareBPS
	}
	if input.FundingPartnerID != nil {
		policyInput.FundingPartnerID = *input.FundingPartnerID
	}
	policyInput = normalizeFundingPolicy(policyInput)
	if err := validateFundingPolicyInput(ctx, tx, next.StoreID, policyInput); err != nil {
		return Coupon{}, FundingPolicy{}, err
	}

	approvedBy := current.ApprovedByActorID
	var approvedAt any
	if current.ApprovedAt != nil {
		approvedAt = *current.ApprovedAt
	}
	var archivedAt any
	if next.Status == "active" {
		if strings.TrimSpace(input.ActorID) == "" {
			return Coupon{}, FundingPolicy{}, ErrInvalid
		}
		approvedBy = strings.TrimSpace(input.ActorID)
		approvedAt = time.Now().UTC()
	}
	if next.Status == "archived" {
		archivedAt = time.Now().UTC()
	}

	coupon, err := scanCoupon(tx.QueryRowContext(ctx, `
		UPDATE dsh_coupons SET
			name_ar=$2,description=$3,store_id=$4,discount_type=$5,
			discount_percent=$6,fixed_discount_minor_units=$7,max_discount_minor_units=$8,
			min_subtotal_minor_units=$9,global_usage_limit=$10,per_client_usage_limit=$11,
			eligible_fulfillment_modes=$12,starts_at=$13,ends_at=$14,status=$15,
			approved_by_actor_id=$16,approved_at=$17,archived_at=$18,
			funding_source=$19,platform_share_bps=$20,funding_partner_id=$21,
			version=version+1,updated_at=NOW()
		WHERE id::text=$1 AND version=$22 AND archived_at IS NULL
		RETURNING `+couponSelectColumns,
		id,
		next.NameAr,
		next.Description,
		next.StoreID,
		next.DiscountType,
		next.DiscountPercent,
		next.FixedDiscountMinorUnits,
		next.MaxDiscountMinorUnits,
		next.MinSubtotalMinorUnits,
		next.GlobalUsageLimit,
		next.PerClientUsageLimit,
		pq.Array(next.EligibleFulfillmentModes),
		startsAt,
		endsAt,
		next.Status,
		approvedBy,
		approvedAt,
		archivedAt,
		policyInput.FundingSource,
		policyInput.PlatformShareBPS,
		policyInput.FundingPartnerID,
		input.ExpectedVersion,
	))
	if errors.Is(err, sql.ErrNoRows) {
		return Coupon{}, FundingPolicy{}, ErrVersionConflict
	}
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}

	policy, err := scanFundingPolicy(tx.QueryRowContext(ctx, `
		SELECT id::TEXT,funding_source,platform_share_bps,funding_partner_id,version,updated_at::TEXT
		FROM dsh_coupons WHERE id=$1::uuid`, coupon.ID))
	if err != nil {
		return Coupon{}, FundingPolicy{}, err
	}
	if err := tx.Commit(); err != nil {
		return Coupon{}, FundingPolicy{}, err
	}
	return coupon, *policy, nil
}

func governedCouponTime(current *string, update **time.Time) (any, *time.Time, error) {
	if update != nil {
		if *update == nil {
			return nil, nil, nil
		}
		value := **update
		return value, &value, nil
	}
	if current == nil || strings.TrimSpace(*current) == "" {
		return nil, nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, *current)
	if err != nil {
		return nil, nil, ErrInvalid
	}
	return parsed, &parsed, nil
}
