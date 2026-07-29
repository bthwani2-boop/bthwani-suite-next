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

// GetWallet is a deferred-runtime compatibility reader only. It is deliberately
// restricted to the explicit legacy-unscoped partition so it can never choose
// an arbitrary tenant wallet when identical actor ids exist across tenants.
// Active HTTP and domain paths must use GetWalletForTenant.
func GetWallet(db *sql.DB, actorType, actorID string) (*Wallet, error) {
	const q = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE tenant_id = 'legacy-unscoped' AND actor_type = $1 AND actor_id = $2
		LIMIT 1`

	row := db.QueryRow(q, actorType, actorID)
	w, err := scanWallet(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get legacy wallet: %w", err)
	}
	return w, nil
}

func GetWalletForTenant(db *sql.DB, operatorContextID, actorType, actorID string) (*Wallet, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return nil, fmt.Errorf("operatorContextId is required")
	}
	const q = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE tenant_id = $1 AND actor_type = $2 AND actor_id = $3
		LIMIT 1`

	row := db.QueryRow(q, operatorContextID, actorType, actorID)
	w, err := scanWallet(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get tenant wallet: %w", err)
	}
	return w, nil
}

// EnsureWalletForTenantTx creates or locks exactly one wallet inside the
// authenticated tenant. Currency is authoritative on creation and must remain
// stable for subsequent calls.
func EnsureWalletForTenantTx(ctx context.Context, tx *sql.Tx, actorType, actorID, currency string) (*Wallet, error) {
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
		INSERT INTO wlt_wallets (tenant_id, actor_id, actor_type, status, currency)
		VALUES ($1, $3, $2, 'active', $4)
		ON CONFLICT (tenant_id, actor_type, actor_id) DO NOTHING`
	if _, err := tx.ExecContext(ctx, insertQ, operatorContextID, actorType, actorID, currency); err != nil {
		return nil, fmt.Errorf("ensure tenant wallet: insert: %w", err)
	}

	const selectQ = `
		SELECT ` + walletCols + `
		FROM wlt_wallets
		WHERE tenant_id = $1 AND actor_type = $2 AND actor_id = $3
		FOR UPDATE`
	row := tx.QueryRowContext(ctx, selectQ, operatorContextID, actorType, actorID)
	w, err := scanWallet(row)
	if err != nil {
		return nil, fmt.Errorf("ensure tenant wallet: select: %w", err)
	}
	if w.Currency != currency {
		return nil, fmt.Errorf("wallet currency %s does not match requested currency %s", w.Currency, currency)
	}
	return w, nil
}

// EnsureWalletTx preserves package compatibility for deferred/local callers.
// In active SaaS mode it fails closed because no trusted tenant is present.
func EnsureWalletTx(tx *sql.Tx, actorType, actorID, currency string) (*Wallet, error) {
	return EnsureWalletForTenantTx(context.Background(), tx, actorType, actorID, currency)
}
