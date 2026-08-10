package commercial

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalidFeePolicy        = errors.New("invalid store onboarding fee policy")
	ErrFeePolicyNotFound       = errors.New("store onboarding fee policy not found")
	ErrFeePolicyVersionConflict = errors.New("store onboarding fee policy version conflict")
)

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
	"first_store":      true,
	"additional_store": true,
	"all_stores":       true,
}

var validChargeTiming = map[string]bool{
	"on_approval":    true,
	"on_publication": true,
	"on_first_order": true,
	"manual":         true,
}

func GetStoreOnboardingFeePolicy(ctx context.Context, db *sql.DB) (StoreOnboardingFeePolicy, error) {
	var policy StoreOnboardingFeePolicy
	var effectiveFrom sql.NullTime
	err := db.QueryRowContext(ctx, `
		SELECT enabled, amount, currency, applies_to, charge_timing,
		       actor_charged, effective_from, notes, COALESCE(updated_by, ''),
		       updated_at, version
		FROM wlt_financial_store_onboarding_fee_policy
		WHERE id = 1`).Scan(
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
		return StoreOnboardingFeePolicy{}, ErrFeePolicyNotFound
	}
	if err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	if effectiveFrom.Valid {
		policy.EffectiveFrom = &effectiveFrom.Time
	}
	return policy, nil
}

func UpsertStoreOnboardingFeePolicy(
	ctx context.Context,
	db *sql.DB,
	input StoreOnboardingFeePolicyInput,
	operatorContextID string,
	actorID string,
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
		input.ExpectedVersion < 1 {
		return StoreOnboardingFeePolicy{}, ErrInvalidFeePolicy
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	defer tx.Rollback()

	var before StoreOnboardingFeePolicy
	var bEffectiveFrom sql.NullTime
	err = tx.QueryRowContext(ctx, `
		SELECT enabled, amount, currency, applies_to, charge_timing,
		       actor_charged, effective_from, notes, COALESCE(updated_by, ''),
		       updated_at, version
		FROM wlt_financial_store_onboarding_fee_policy
		WHERE id = 1
		FOR UPDATE`).Scan(
		&before.Enabled,
		&before.Amount,
		&before.Currency,
		&before.AppliesTo,
		&before.ChargeTiming,
		&before.ActorCharged,
		&bEffectiveFrom,
		&before.Notes,
		&before.UpdatedBy,
		&before.UpdatedAt,
		&before.Version,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return StoreOnboardingFeePolicy{}, ErrFeePolicyNotFound
	}
	if err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	if before.Version != input.ExpectedVersion {
		return StoreOnboardingFeePolicy{}, ErrFeePolicyVersionConflict
	}

	var result StoreOnboardingFeePolicy
	var effectiveFrom sql.NullTime
	err = tx.QueryRowContext(ctx, `
		UPDATE wlt_financial_store_onboarding_fee_policy
		SET enabled = $1, amount = $2, currency = $3, applies_to = $4,
		    charge_timing = $5, effective_from = $6, notes = $7,
		    updated_by = $8, updated_at = NOW(), version = version + 1
		WHERE id = 1
		RETURNING enabled, amount, currency, applies_to, charge_timing,
		          actor_charged, effective_from, notes, COALESCE(updated_by, ''),
		          updated_at, version`,
		input.Enabled, input.Amount, input.Currency, input.AppliesTo,
		input.ChargeTiming, input.EffectiveFrom, input.Notes, actorID,
	).Scan(
		&result.Enabled, &result.Amount, &result.Currency, &result.AppliesTo,
		&result.ChargeTiming, &result.ActorCharged, &effectiveFrom, &result.Notes,
		&result.UpdatedBy, &result.UpdatedAt, &result.Version,
	)
	if err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	if effectiveFrom.Valid {
		result.EffectiveFrom = &effectiveFrom.Time
	}

	// WLT Audit / Event logging could be added here similar to existing WLT practices

	if err := tx.Commit(); err != nil {
		return StoreOnboardingFeePolicy{}, err
	}
	return result, nil
}
