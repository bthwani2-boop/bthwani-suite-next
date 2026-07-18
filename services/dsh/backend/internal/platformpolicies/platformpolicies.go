package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// StoreOnboardingFeePolicy is a DSH-owned policy definition only. It never
// creates a balance or ledger entry; WLT remains the sole financial owner.
type StoreOnboardingFeePolicy struct {
	Enabled       bool       `json:"enabled"`
	Amount        float64    `json:"amount"`
	Currency      string     `json:"currency"`
	AppliesTo     string     `json:"appliesTo"`
	ChargeTiming  string     `json:"chargeTiming"`
	ActorCharged  string     `json:"actorCharged"`
	EffectiveFrom *time.Time `json:"effectiveFrom"`
	Notes         string     `json:"notes"`
	UpdatedBy     string     `json:"updatedBy"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	Version       int        `json:"version"`
	IsConfigured  bool       `json:"isConfigured"`
	BlockedReason string     `json:"blockedReason,omitempty"`
}

type StoreOnboardingFeePolicyInput struct {
	Enabled         bool       `json:"enabled"`
	Amount          float64    `json:"amount"`
	Currency        string     `json:"currency"`
	AppliesTo       string     `json:"appliesTo"`
	ChargeTiming    string     `json:"chargeTiming"`
	EffectiveFrom   *time.Time `json:"effectiveFrom,omitempty"`
	Notes           string     `json:"notes,omitempty"`
	ExpectedVersion int        `json:"expectedVersion"`
}

var validAppliesTo = map[string]bool{
	"first_store":     true,
	"additional_store": true,
	"all_stores":      true,
}

var validChargeTiming = map[string]bool{
	"on_approval":    true,
	"on_publication": true,
	"on_first_order": true,
	"manual":         true,
}

func deriveFeePolicyReadiness(policy *StoreOnboardingFeePolicy) {
	policy.BlockedReason = ""
	if !policy.Enabled {
		policy.IsConfigured = true
		return
	}
	if policy.Amount <= 0 || policy.Currency == "" {
		policy.IsConfigured = false
		policy.BlockedReason = "الرسم مُفعّل لكن المبلغ أو العملة غير مكتملين"
		return
	}
	policy.IsConfigured = true
}

func GetStoreOnboardingFeePolicy(
	ctx context.Context,
	db *sql.DB,
) (StoreOnboardingFeePolicy, error) {
	return scanStoreOnboardingFeePolicy(db.QueryRowContext(ctx, `
		SELECT enabled, amount, currency, applies_to, charge_timing,
		       actor_charged, effective_from, notes, COALESCE(updated_by, ''),
		       updated_at, version
		FROM dsh_platform_store_onboarding_fee_policy
		WHERE id = 1`))
}

func UpsertStoreOnboardingFeePolicy(
	ctx context.Context,
	db *sql.DB,
	input StoreOnboardingFeePolicyInput,
	mutation MutationContext,
) (StoreOnboardingFeePolicy, error) {
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.AppliesTo = strings.TrimSpace(input.AppliesTo)
	input.ChargeTiming = strings.TrimSpace(input.ChargeTiming)
	input.Notes = strings.TrimSpace(input.Notes)
	if input.AppliesTo == "" {
		input.AppliesTo = "first_store"
	}
	if input.ChargeTiming == "" {
		input.ChargeTiming = "on_approval"
	}
	if !validAppliesTo[input.AppliesTo] ||
		!validChargeTiming[input.ChargeTiming] ||
		input.Amount < 0 ||
		len(input.Currency) != 3 ||
		len(input.Notes) > 1000 ||
		input.ExpectedVersion < 1 ||
		!validMutation(mutation) {
		return StoreOnboardingFeePolicy{}, ErrInvalid
	}

	return withIdempotency(
		ctx,
		db,
		mutation,
		"upsert-store-onboarding-fee",
		input,
		func(tx *sql.Tx) (StoreOnboardingFeePolicy, error) {
			before, err := scanStoreOnboardingFeePolicy(tx.QueryRowContext(ctx, `
				SELECT enabled, amount, currency, applies_to, charge_timing,
				       actor_charged, effective_from, notes,
				       COALESCE(updated_by, ''), updated_at, version
				FROM dsh_platform_store_onboarding_fee_policy
				WHERE id = 1
				FOR UPDATE`))
			if errors.Is(err, ErrNotFound) {
				return StoreOnboardingFeePolicy{}, ErrNotFound
			}
			if err != nil {
				return StoreOnboardingFeePolicy{}, err
			}
			if before.Version != input.ExpectedVersion {
				return StoreOnboardingFeePolicy{}, ErrVersionConflict
			}

			var result StoreOnboardingFeePolicy
			var effectiveFrom sql.NullTime
			err = tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_store_onboarding_fee_policy
				SET enabled = $1,
				    amount = $2,
				    currency = $3,
				    applies_to = $4,
				    charge_timing = $5,
				    effective_from = $6,
				    notes = $7,
				    updated_by = $8,
				    updated_at = NOW(),
				    version = version + 1
				WHERE id = 1
				RETURNING enabled, amount, currency, applies_to, charge_timing,
				          actor_charged, effective_from, notes,
				          COALESCE(updated_by, ''), updated_at, version`,
				input.Enabled,
				input.Amount,
				input.Currency,
				input.AppliesTo,
				input.ChargeTiming,
				input.EffectiveFrom,
				input.Notes,
				mutation.ActorID,
			).Scan(
				&result.Enabled,
				&result.Amount,
				&result.Currency,
				&result.AppliesTo,
				&result.ChargeTiming,
				&result.ActorCharged,
				&effectiveFrom,
				&result.Notes,
				&result.UpdatedBy,
				&result.UpdatedAt,
				&result.Version,
			)
			if err != nil {
				return StoreOnboardingFeePolicy{}, err
			}
			if effectiveFrom.Valid {
				result.EffectiveFrom = &effectiveFrom.Time
			}
			deriveFeePolicyReadiness(&result)
			if err := insertEvent(
				ctx,
				tx,
				"store_onboarding_fee",
				"singleton",
				"updated",
				mutation,
				before.Version,
				result.Version,
				result,
			); err != nil {
				return StoreOnboardingFeePolicy{}, err
			}
			return result, nil
		},
	)
}

type feePolicyScanner interface {
	Scan(dest ...any) error
}

func scanStoreOnboardingFeePolicy(
	row feePolicyScanner,
) (StoreOnboardingFeePolicy, error) {
	var policy StoreOnboardingFeePolicy
	var effectiveFrom sql.NullTime
	err := row.Scan(
		&policy.Enabled,
		&policy.Amount,
		&policy.Currency,
		&policy.AppliesTo,
		&policy.ChargeTiming,
		&policy.ActorCharged,
		&effectiveFrom,
		&policy.Notes,
		&policy.UpdatedBy,
		&policy.UpdatedAt,
		&policy.Version,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return policy, ErrNotFound
	}
	if err != nil {
		return policy, err
	}
	if effectiveFrom.Valid {
		policy.EffectiveFrom = &effectiveFrom.Time
	}
	deriveFeePolicyReadiness(&policy)
	return policy, nil
}
