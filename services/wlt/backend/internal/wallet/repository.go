package wallet

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"wlt-api/internal/shared"
)

const walletCols = `id, actor_id, actor_type, status, currency,
	available_balance_minor_units, pending_balance_minor_units, held_balance_minor_units,
	collateral_reserved_balance_minor_units,
	earned_total_minor_units, settled_total_minor_units, paid_total_minor_units,
	last_ledger_entry_at, updated_at,
	COALESCE((SELECT minimum_collateral_minor_units FROM wlt_captain_collateral_policies cp
		WHERE cp.operator_context_id = wlt_wallets.operator_context_id
		  AND cp.enabled
		  AND wlt_wallets.actor_type = 'captain'), 0),
	COALESCE((SELECT SUM(d.outstanding_amount_minor_units) FROM wlt_provider_debts d
		WHERE d.operator_context_id = wlt_wallets.operator_context_id
		  AND d.provider_actor_type = wlt_wallets.actor_type
		  AND d.provider_actor_id = wlt_wallets.actor_id
		  AND d.currency = wlt_wallets.currency
		  AND d.status IN ('open','partially_settled')), 0),
	COALESCE((SELECT COUNT(*) FROM wlt_captain_collateral_positions p
		WHERE p.operator_context_id = wlt_wallets.operator_context_id
		  AND p.captain_id = wlt_wallets.actor_id
		  AND p.currency = wlt_wallets.currency
		  AND p.status = 'active'), 0),
	CASE WHEN wlt_wallets.actor_type = 'captain'
		  AND wlt_wallets.pending_balance_minor_units = 0
		  AND wlt_wallets.held_balance_minor_units = 0
		  AND COALESCE(wlt_wallets.cod_reserved_balance_minor_units, 0) = 0
		  AND NOT EXISTS (
			SELECT 1 FROM wlt_provider_debts d
			WHERE d.operator_context_id = wlt_wallets.operator_context_id
			  AND d.provider_actor_type = 'captain'
			  AND d.provider_actor_id = wlt_wallets.actor_id
			  AND d.currency = wlt_wallets.currency
			  AND d.status IN ('open','partially_settled')
		  )
		THEN GREATEST(
			wlt_wallets.collateral_reserved_balance_minor_units -
			COALESCE((SELECT minimum_collateral_minor_units FROM wlt_captain_collateral_policies cp
				WHERE cp.operator_context_id = wlt_wallets.operator_context_id AND cp.enabled), 0),
			0
		)
		ELSE 0
	END`

// walletScanner is satisfied by both *sql.Row and *sql.Rows.
type walletScanner interface {
	Scan(dest ...any) error
}

func scanWallet(s walletScanner) (*Wallet, error) {
	var w Wallet
	var lastLedgerEntryAt sql.NullString
	err := s.Scan(
		&w.ID, &w.ActorID, &w.ActorType, &w.Status, &w.Currency,
		&w.AvailableBalanceMinorUnits, &w.PendingBalanceMinorUnits, &w.HeldBalanceMinorUnits,
		&w.CollateralReservedBalanceMinorUnits,
		&w.EarnedTotalMinorUnits, &w.SettledTotalMinorUnits, &w.PaidTotalMinorUnits,
		&lastLedgerEntryAt, &w.UpdatedAt,
		&w.ProtectedMinimumCollateralMinorUnits, &w.OutstandingDebtMinorUnits,
		&w.ActiveCollateralPositionCount, &w.ReleasableCollateralExcessMinorUnits,
	)
	if err != nil {
		return nil, err
	}
	if lastLedgerEntryAt.Valid {
		w.LastLedgerEntryAt = &lastLedgerEntryAt.String
	}
	return &w, nil
}

func GetWalletForOperatorContext(db *sql.DB, operatorContextID, actorType, actorID string) (*Wallet, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("operatorContextId is required")
	}
	const q = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE operator_context_id = $1 AND actor_type = $2 AND actor_id = $3
		LIMIT 1`

	row := db.QueryRow(q, operatorContextID, actorType, actorID)
	w, err := scanWallet(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get OperatorContext wallet: %w", err)
	}
	return w, nil
}

// EnsureWalletForOperatorContextTx creates or locks exactly one wallet inside the
// authenticated OperatorContext. Currency is authoritative on creation and must remain
// stable for subsequent calls.
func EnsureWalletForOperatorContextTx(ctx context.Context, tx *sql.Tx, actorType, actorID, currency string) (*Wallet, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	actorType = strings.TrimSpace(actorType)
	actorID = strings.TrimSpace(actorID)
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if actorType == "" || actorID == "" || len(currency) != 3 {
		return nil, fmt.Errorf("actorType, actorId and a three-letter currency are required")
	}

	const insertQ = `
		INSERT INTO wlt_wallets (operator_context_id, actor_id, actor_type, status, currency)
		VALUES ($1, $3, $2, 'active', $4)
		ON CONFLICT (operator_context_id, actor_type, actor_id) DO NOTHING`
	if _, err := tx.ExecContext(ctx, insertQ, operatorContextID, actorType, actorID, currency); err != nil {
		return nil, fmt.Errorf("ensure OperatorContext wallet: insert: %w", err)
	}

	const selectQ = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE operator_context_id = $1 AND actor_type = $2 AND actor_id = $3
		FOR UPDATE`
	row := tx.QueryRowContext(ctx, selectQ, operatorContextID, actorType, actorID)
	w, err := scanWallet(row)
	if err != nil {
		return nil, fmt.Errorf("ensure OperatorContext wallet: select: %w", err)
	}
	if w.Currency != currency {
		return nil, fmt.Errorf("wallet currency %s does not match requested currency %s", w.Currency, currency)
	}
	return w, nil
}
