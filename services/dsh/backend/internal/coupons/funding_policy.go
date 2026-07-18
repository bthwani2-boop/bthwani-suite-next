package coupons

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

type FundingPolicy struct {
	CouponID         string  `json:"couponId"`
	FundingSource    string  `json:"fundingSource"`
	PlatformShareBPS int     `json:"platformShareBps"`
	FundingPartnerID *string `json:"fundingPartnerId,omitempty"`
	Version          int     `json:"version"`
	UpdatedAt        string  `json:"updatedAt"`
}

type UpdateFundingPolicyInput struct {
	FundingSource    string  `json:"fundingSource"`
	PlatformShareBPS int     `json:"platformShareBps"`
	FundingPartnerID *string `json:"fundingPartnerId"`
	ExpectedVersion  int     `json:"expectedVersion"`
}

func normalizeFundingPolicy(input UpdateFundingPolicyInput) UpdateFundingPolicyInput {
	input.FundingSource = strings.TrimSpace(input.FundingSource)
	if input.FundingSource == "" {
		input.FundingSource = "platform"
	}
	if input.FundingSource == "platform" && input.PlatformShareBPS == 0 {
		input.PlatformShareBPS = 10000
	}
	if input.FundingPartnerID != nil {
		trimmed := strings.TrimSpace(*input.FundingPartnerID)
		if trimmed == "" {
			input.FundingPartnerID = nil
		} else {
			input.FundingPartnerID = &trimmed
		}
	}
	return input
}

func validateFundingPolicyInput(
	ctx context.Context,
	query interface {
		QueryRowContext(context.Context, string, ...any) *sql.Row
	},
	storeID *string,
	input UpdateFundingPolicyInput,
) error {
	input = normalizeFundingPolicy(input)
	switch input.FundingSource {
	case "platform":
		if input.PlatformShareBPS != 10000 || input.FundingPartnerID != nil {
			return ErrInvalid
		}
		return nil
	case "partner":
		if input.PlatformShareBPS != 0 || input.FundingPartnerID == nil || storeID == nil {
			return ErrInvalid
		}
	case "shared":
		if input.PlatformShareBPS <= 0 || input.PlatformShareBPS >= 10000 || input.FundingPartnerID == nil || storeID == nil {
			return ErrInvalid
		}
	default:
		return ErrInvalid
	}

	var ownsStore bool
	if err := query.QueryRowContext(ctx, `SELECT EXISTS(
		SELECT 1 FROM dsh_stores
		WHERE id=$1 AND partner_id=$2 AND archived_at IS NULL
	)`, *storeID, *input.FundingPartnerID).Scan(&ownsStore); err != nil {
		return err
	}
	if !ownsStore {
		return ErrInvalid
	}
	return nil
}

func scanFundingPolicy(row interface{ Scan(...any) error }) (*FundingPolicy, error) {
	var policy FundingPolicy
	var partner sql.NullString
	if err := row.Scan(
		&policy.CouponID,
		&policy.FundingSource,
		&policy.PlatformShareBPS,
		&partner,
		&policy.Version,
		&policy.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if partner.Valid {
		policy.FundingPartnerID = &partner.String
	}
	return &policy, nil
}

func GetFundingPolicy(ctx context.Context, db *sql.DB, couponID string) (*FundingPolicy, error) {
	if db == nil || strings.TrimSpace(couponID) == "" {
		return nil, ErrInvalid
	}
	return scanFundingPolicy(db.QueryRowContext(ctx, `SELECT id::TEXT,funding_source,
		platform_share_bps,funding_partner_id,version,updated_at::TEXT
		FROM dsh_coupons WHERE id=$1::uuid AND archived_at IS NULL`, strings.TrimSpace(couponID)))
}

func ListFundingPolicies(ctx context.Context, db *sql.DB) (map[string]FundingPolicy, error) {
	rows, err := db.QueryContext(ctx, `SELECT id::TEXT,funding_source,
		platform_share_bps,funding_partner_id,version,updated_at::TEXT
		FROM dsh_coupons WHERE archived_at IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := map[string]FundingPolicy{}
	for rows.Next() {
		policy, err := scanFundingPolicy(rows)
		if err != nil {
			return nil, err
		}
		result[policy.CouponID] = *policy
	}
	return result, rows.Err()
}

func UpdateFundingPolicy(
	ctx context.Context,
	db *sql.DB,
	couponID string,
	input UpdateFundingPolicyInput,
) (*FundingPolicy, error) {
	couponID = strings.TrimSpace(couponID)
	input = normalizeFundingPolicy(input)
	if db == nil || couponID == "" || input.ExpectedVersion <= 0 {
		return nil, ErrInvalid
	}

	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var store sql.NullString
	var status string
	var version int
	if err := tx.QueryRowContext(ctx, `SELECT store_id,status,version
		FROM dsh_coupons WHERE id=$1::uuid AND archived_at IS NULL FOR UPDATE`, couponID).
		Scan(&store, &status, &version); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if version != input.ExpectedVersion {
		return nil, ErrVersionConflict
	}
	if status != "draft" && status != "paused" {
		return nil, ErrInvalid
	}
	var storeID *string
	if store.Valid {
		storeID = &store.String
	}
	if err := validateFundingPolicyInput(ctx, tx, storeID, input); err != nil {
		return nil, err
	}

	policy, err := scanFundingPolicy(tx.QueryRowContext(ctx, `UPDATE dsh_coupons SET
		funding_source=$2,platform_share_bps=$3,funding_partner_id=$4,
		version=version+1,updated_at=NOW()
		WHERE id=$1::uuid AND version=$5 AND archived_at IS NULL
		RETURNING id::TEXT,funding_source,platform_share_bps,
		funding_partner_id,version,updated_at::TEXT`,
		couponID,
		input.FundingSource,
		input.PlatformShareBPS,
		input.FundingPartnerID,
		input.ExpectedVersion,
	))
	if errors.Is(err, ErrNotFound) {
		return nil, ErrVersionConflict
	}
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return policy, nil
}
