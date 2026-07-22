package wallet

import (
	"database/sql"
	"fmt"
	"strings"
)

const walletCols = `id, actor_id, actor_type, status, currency,
	available_balance_minor_units, pending_balance_minor_units, held_balance_minor_units,
	earned_total_minor_units, settled_total_minor_units, paid_total_minor_units,
	last_ledger_entry_at, updated_at`

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
		&w.EarnedTotalMinorUnits, &w.SettledTotalMinorUnits, &w.PaidTotalMinorUnits,
		&lastLedgerEntryAt, &w.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if lastLedgerEntryAt.Valid {
		w.LastLedgerEntryAt = &lastLedgerEntryAt.String
	}
	return &w, nil
}

// GetWallet is retained for internal WLT callers that already own a globally
// resolved actor identity. HTTP representative reads must use
// GetWalletForTenant so a finance operator cannot cross a SaaS tenant boundary.
func GetWallet(db *sql.DB, actorType, actorID string) (*Wallet, error) {
	const q = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE actor_type = $1 AND actor_id = $2
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, actorType, actorID)
	w, err := scanWallet(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	return w, nil
}

func GetWalletForTenant(db *sql.DB, tenantID, actorType, actorID string) (*Wallet, error) {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return nil, fmt.Errorf("tenantId is required")
	}
	const q = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE tenant_id = $1 AND actor_type = $2 AND actor_id = $3
		ORDER BY updated_at DESC
		LIMIT 1`

	row := db.QueryRow(q, tenantID, actorType, actorID)
	w, err := scanWallet(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get tenant wallet: %w", err)
	}
	return w, nil
}

// EnsureWalletTx creates a zero-balance wallet row for (actorType, actorID) if
// one doesn't already exist, then returns the current row locked FOR UPDATE
// so the caller can safely read-modify-write balances within its own
// transaction. currency is only used when creating a new row.
func EnsureWalletTx(tx *sql.Tx, actorType, actorID, currency string) (*Wallet, error) {
	const insertQ = `
		INSERT INTO wlt_wallets (actor_id, actor_type, status, currency)
		VALUES ($2, $1, 'active', $3)
		ON CONFLICT (actor_type, actor_id) DO NOTHING`
	if _, err := tx.Exec(insertQ, actorType, actorID, currency); err != nil {
		return nil, fmt.Errorf("ensure wallet: insert: %w", err)
	}

	const selectQ = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE actor_type = $1 AND actor_id = $2
		FOR UPDATE`
	row := tx.QueryRow(selectQ, actorType, actorID)
	w, err := scanWallet(row)
	if err != nil {
		return nil, fmt.Errorf("ensure wallet: select: %w", err)
	}
	return w, nil
}
