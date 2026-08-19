package payout

import (
	"context"
	"database/sql"
	"fmt"

	"wlt-api/internal/shared"
)

// releasePayoutReservation returns a payout's still-held entitlement to the
// canonical wallet projection. It must run in the same transaction as the
// terminal state change that makes the reservation no longer financially live.
func releasePayoutReservation(ctx context.Context, tx *sql.Tx, req *PayoutRequest) error {
	if req == nil || req.AmountMinorUnits <= 0 || req.BeneficiaryActorID == "" || req.BeneficiaryActorType == "" {
		return fmt.Errorf("complete payout reservation identity is required")
	}
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET held_balance_minor_units = held_balance_minor_units - $4,
		    available_balance_minor_units = available_balance_minor_units + $4,
		    updated_at = now()
		WHERE operator_context_id=$1 AND actor_id=$2 AND actor_type=$3
		  AND held_balance_minor_units >= $4`,
		operatorContextID, req.BeneficiaryActorID, req.BeneficiaryActorType, req.AmountMinorUnits)
	if err != nil {
		return fmt.Errorf("release payout wallet reservation: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read payout reservation release result: %w", err)
	}
	if rows != 1 {
		return fmt.Errorf("payout wallet reservation is missing or inconsistent")
	}
	return nil
}

// settlePayoutReservation atomically converts the held entitlement into a paid
// wallet projection after the canonical double-entry payout journal is posted.
// Available balance was already reduced when the request reserved the amount;
// completion therefore releases the hold into paid_total without debiting the
// available projection a second time. The caller owns the surrounding
// transaction, so ledger posting, wallet projection and payout completion
// either commit together or all roll back.
func settlePayoutReservation(ctx context.Context, tx *sql.Tx, req *PayoutRequest) error {
	if req == nil || req.AmountMinorUnits <= 0 || req.BeneficiaryActorID == "" || req.BeneficiaryActorType == "" {
		return fmt.Errorf("complete payout reservation identity is required")
	}
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE wlt_wallets
		SET held_balance_minor_units = held_balance_minor_units - $4,
		    paid_total_minor_units = paid_total_minor_units + $4,
		    updated_at = now()
		WHERE operator_context_id=$1 AND actor_id=$2 AND actor_type=$3
		  AND held_balance_minor_units >= $4`,
		operatorContextID, req.BeneficiaryActorID, req.BeneficiaryActorType, req.AmountMinorUnits)
	if err != nil {
		return fmt.Errorf("settle payout wallet reservation: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read payout reservation settlement result: %w", err)
	}
	if rows != 1 {
		return fmt.Errorf("payout wallet reservation is missing or inconsistent")
	}
	return nil
}
