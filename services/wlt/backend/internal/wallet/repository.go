package wallet

import (
	"database/sql"
	"fmt"
)

func GetWallet(db *sql.DB, actorType, actorID string) (*Wallet, error) {
	const q = `
		SELECT id, actor_id, actor_type, status, currency,
			available_balance_minor_units, pending_balance_minor_units, held_balance_minor_units,
			earned_total_minor_units, settled_total_minor_units, paid_total_minor_units,
			last_ledger_entry_at, updated_at
		FROM wlt_wallets
		WHERE actor_type = $1 AND actor_id = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, actorType, actorID)
	var w Wallet
	var lastLedgerEntryAt sql.NullString
	err := row.Scan(
		&w.ID, &w.ActorID, &w.ActorType, &w.Status, &w.Currency,
		&w.AvailableBalanceMinorUnits, &w.PendingBalanceMinorUnits, &w.HeldBalanceMinorUnits,
		&w.EarnedTotalMinorUnits, &w.SettledTotalMinorUnits, &w.PaidTotalMinorUnits,
		&lastLedgerEntryAt, &w.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	if lastLedgerEntryAt.Valid {
		w.LastLedgerEntryAt = &lastLedgerEntryAt.String
	}
	return &w, nil
}
