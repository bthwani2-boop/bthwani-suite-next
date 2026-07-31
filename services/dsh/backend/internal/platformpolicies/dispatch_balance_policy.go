package platformpolicies

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// DispatchBalancePolicy is DSH-owned operational policy. WLT remains the owner
// of wallet balances and ledger entries; this policy only defines the minimum
// readback required before DSH may create or accept a captain assignment.
type DispatchBalancePolicy struct {
	Enabled                              bool      `json:"enabled"`
	RequirePositiveBalance               bool      `json:"requirePositiveBalance"`
	MinimumDispatchBalanceMinorUnits     int64     `json:"minimumDispatchBalanceMinorUnits"`
	MinimumCODBalanceMinorUnits          int64     `json:"minimumCodBalanceMinorUnits"`
	Currency                             string    `json:"currency"`
	SnapshotTTLSeconds                   int       `json:"snapshotTtlSeconds"`
	Notes                                string    `json:"notes"`
	UpdatedBy                            string    `json:"updatedBy"`
	UpdatedAt                            time.Time `json:"updatedAt"`
	Version                              int       `json:"version"`
}

type DispatchBalancePolicyInput struct {
	Enabled                          bool   `json:"enabled"`
	RequirePositiveBalance           bool   `json:"requirePositiveBalance"`
	MinimumDispatchBalanceMinorUnits int64  `json:"minimumDispatchBalanceMinorUnits"`
	MinimumCODBalanceMinorUnits      int64  `json:"minimumCodBalanceMinorUnits"`
	Currency                         string `json:"currency"`
	SnapshotTTLSeconds               int    `json:"snapshotTtlSeconds"`
	Notes                            string `json:"notes"`
	ExpectedVersion                  int    `json:"expectedVersion"`
}

func GetDispatchBalancePolicy(ctx context.Context, db *sql.DB) (DispatchBalancePolicy, error) {
	return scanDispatchBalancePolicy(db.QueryRowContext(ctx, `
		SELECT enabled,require_positive_balance,minimum_dispatch_balance_minor_units,
			minimum_cod_balance_minor_units,currency,snapshot_ttl_seconds,notes,
			updated_by,updated_at,version
		FROM dsh_platform_dispatch_balance_policy
		WHERE id=1`))
}

func UpsertDispatchBalancePolicy(
	ctx context.Context,
	db *sql.DB,
	input DispatchBalancePolicyInput,
	mutation MutationContext,
) (DispatchBalancePolicy, error) {
	input.Currency = strings.ToUpper(strings.TrimSpace(input.Currency))
	input.Notes = strings.TrimSpace(input.Notes)
	if len(input.Currency) != 3 || input.MinimumDispatchBalanceMinorUnits < 0 ||
		input.MinimumCODBalanceMinorUnits < input.MinimumDispatchBalanceMinorUnits ||
		input.SnapshotTTLSeconds < 30 || input.SnapshotTTLSeconds > 600 ||
		len(input.Notes) > 1000 || input.ExpectedVersion < 1 || !validMutation(mutation) {
		return DispatchBalancePolicy{}, ErrInvalid
	}

	return withIdempotency(ctx, db, mutation, "upsert-dispatch-balance-policy", input,
		func(tx *sql.Tx) (DispatchBalancePolicy, error) {
			before, err := scanDispatchBalancePolicy(tx.QueryRowContext(ctx, `
				SELECT enabled,require_positive_balance,minimum_dispatch_balance_minor_units,
					minimum_cod_balance_minor_units,currency,snapshot_ttl_seconds,notes,
					updated_by,updated_at,version
				FROM dsh_platform_dispatch_balance_policy
				WHERE id=1 FOR UPDATE`))
			if errors.Is(err, ErrNotFound) {
				return DispatchBalancePolicy{}, ErrNotFound
			}
			if err != nil {
				return DispatchBalancePolicy{}, err
			}
			if before.Version != input.ExpectedVersion {
				return DispatchBalancePolicy{}, ErrVersionConflict
			}

			result, err := scanDispatchBalancePolicy(tx.QueryRowContext(ctx, `
				UPDATE dsh_platform_dispatch_balance_policy
				SET enabled=$1,require_positive_balance=$2,
					minimum_dispatch_balance_minor_units=$3,
					minimum_cod_balance_minor_units=$4,currency=$5,
					snapshot_ttl_seconds=$6,notes=$7,updated_by=$8,
					updated_at=now(),version=version+1
				WHERE id=1
				RETURNING enabled,require_positive_balance,minimum_dispatch_balance_minor_units,
					minimum_cod_balance_minor_units,currency,snapshot_ttl_seconds,notes,
					updated_by,updated_at,version`,
				input.Enabled, input.RequirePositiveBalance,
				input.MinimumDispatchBalanceMinorUnits, input.MinimumCODBalanceMinorUnits,
				input.Currency, input.SnapshotTTLSeconds, input.Notes, mutation.ActorID))
			if err != nil {
				return DispatchBalancePolicy{}, err
			}
			if err := insertEvent(ctx, tx, "dispatch_balance_policy", "singleton", "updated",
				mutation, before.Version, result.Version, result); err != nil {
				return DispatchBalancePolicy{}, err
			}
			return result, nil
		})
}

type dispatchBalancePolicyScanner interface {
	Scan(dest ...any) error
}

func scanDispatchBalancePolicy(row dispatchBalancePolicyScanner) (DispatchBalancePolicy, error) {
	var policy DispatchBalancePolicy
	err := row.Scan(
		&policy.Enabled,
		&policy.RequirePositiveBalance,
		&policy.MinimumDispatchBalanceMinorUnits,
		&policy.MinimumCODBalanceMinorUnits,
		&policy.Currency,
		&policy.SnapshotTTLSeconds,
		&policy.Notes,
		&policy.UpdatedBy,
		&policy.UpdatedAt,
		&policy.Version,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return policy, ErrNotFound
	}
	return policy, err
}
