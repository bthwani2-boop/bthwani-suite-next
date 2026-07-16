package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ErrUnbalancedTransaction is returned when the supplied lines' debits and
// credits do not net to zero for every currency involved.
var ErrUnbalancedTransaction = errors.New("ledger transaction is not balanced")

// LedgerLine describes one leg of a ledger transaction. Exactly two lines
// (one debit, one credit) are required per transaction in this constrained
// kernel -- see wlt-017_ledger_kernel.sql for why a full chart-of-accounts
// journal was not built.
type LedgerLine struct {
	AccountType      string // wallet | platform_revenue | platform_payable | provider_clearing | platform_commission_receivable
	ActorType        string // required when AccountType == "wallet"
	ActorID          string // required when AccountType == "wallet"
	DebitCredit      string // "debit" | "credit"
	AmountMinorUnits int64
	Currency         string
}

// Actor identifies who/what caused a ledger transaction to be posted, for
// audit purposes.
type Actor struct {
	ID   string
	Type string
}

// PostLedgerTransaction is the only write path for the double-entry ledger
// kernel. It must be called with a transaction (tx) that the caller also
// uses for its own status-changing statements, so the ledger posting and
// the business-state transition commit or roll back together.
//
// It validates that lines net to zero per currency, resolves (lazily
// creating if needed) each line's account, applies an atomic balance update
// per account, and writes the transaction header + line rows. It returns
// the new ledger_transaction_id.
func PostLedgerTransaction(ctx context.Context, tx *sql.Tx, transactionType, referenceType, referenceID string, lines []LedgerLine, createdBy Actor) (string, error) {
	if transactionType == "" {
		return "", fmt.Errorf("transactionType is required")
	}
	if len(lines) != 2 {
		return "", fmt.Errorf("exactly two ledger lines (one debit, one credit) are required, got %d", len(lines))
	}

	totals := map[string]int64{} // currency -> signed total (debit +, credit -)
	for i, line := range lines {
		if line.DebitCredit != "debit" && line.DebitCredit != "credit" {
			return "", fmt.Errorf("line %d: debitCredit must be 'debit' or 'credit'", i)
		}
		if line.AmountMinorUnits <= 0 {
			return "", fmt.Errorf("line %d: amountMinorUnits must be positive", i)
		}
		if line.Currency == "" {
			return "", fmt.Errorf("line %d: currency is required", i)
		}
		if line.AccountType == "" {
			return "", fmt.Errorf("line %d: accountType is required", i)
		}
		if line.AccountType == "wallet" && (line.ActorType == "" || line.ActorID == "") {
			return "", fmt.Errorf("line %d: actorType and actorId are required for wallet accounts", i)
		}
		delta := line.AmountMinorUnits
		if line.DebitCredit == "credit" {
			delta = -delta
		}
		totals[line.Currency] += delta
	}
	for currency, total := range totals {
		if total != 0 {
			return "", fmt.Errorf("%w: currency %s debits/credits differ by %d minor units", ErrUnbalancedTransaction, currency, total)
		}
	}

	var transactionID string
	err := tx.QueryRowContext(ctx, `
		INSERT INTO wlt_ledger_transactions (transaction_type, reference_type, reference_id, created_by_actor_id, created_by_actor_type)
		VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''))
		RETURNING id`,
		transactionType, referenceType, referenceID, createdBy.ID, createdBy.Type,
	).Scan(&transactionID)
	if err != nil {
		return "", fmt.Errorf("insert ledger transaction: %w", err)
	}

	for _, line := range lines {
		accountID, err := getOrCreateAccountTx(ctx, tx, line.AccountType, line.ActorType, line.ActorID, line.Currency)
		if err != nil {
			return "", fmt.Errorf("resolve account for %s line: %w", line.AccountType, err)
		}

		delta := line.AmountMinorUnits
		if line.DebitCredit == "credit" {
			delta = -delta
		}

		var runningBalance int64
		err = tx.QueryRowContext(ctx, `
			UPDATE wlt_ledger_accounts
			SET balance_minor_units = balance_minor_units + $1, updated_at = now()
			WHERE id = $2
			RETURNING balance_minor_units`,
			delta, accountID,
		).Scan(&runningBalance)
		if err != nil {
			return "", fmt.Errorf("update account balance: %w", err)
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO wlt_ledger_lines (ledger_transaction_id, account_id, debit_credit, amount_minor_units, currency, running_balance_after)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			transactionID, accountID, line.DebitCredit, line.AmountMinorUnits, line.Currency, runningBalance,
		)
		if err != nil {
			return "", fmt.Errorf("insert ledger line: %w", err)
		}
	}

	return transactionID, nil
}

// getOrCreateAccountTx resolves the account row for a line, locking it via
// the UPDATE in PostLedgerTransaction's caller (a fresh account row created
// here has no concurrent writers yet, and an existing row is only mutated
// through the atomic UPDATE ... RETURNING above, so a separate SELECT ...
// FOR UPDATE is not needed here).
func getOrCreateAccountTx(ctx context.Context, tx *sql.Tx, accountType, actorType, actorID, currency string) (string, error) {
	var id string
	var err error
	if accountType == "wallet" {
		err = tx.QueryRowContext(ctx, `
			SELECT id FROM wlt_ledger_accounts
			WHERE account_type = 'wallet' AND actor_type = $1 AND actor_id = $2 AND currency = $3`,
			actorType, actorID, currency,
		).Scan(&id)
	} else {
		err = tx.QueryRowContext(ctx, `
			SELECT id FROM wlt_ledger_accounts
			WHERE account_type = $1 AND currency = $2 AND actor_id IS NULL`,
			accountType, currency,
		).Scan(&id)
	}
	if err == nil {
		return id, nil
	}
	if err != sql.ErrNoRows {
		return "", err
	}

	if accountType == "wallet" {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO wlt_ledger_accounts (account_type, actor_type, actor_id, currency)
			VALUES ('wallet', $1, $2, $3)
			ON CONFLICT (account_type, actor_type, actor_id, currency) WHERE account_type = 'wallet'
			DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
			RETURNING id`,
			actorType, actorID, currency,
		).Scan(&id)
	} else {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO wlt_ledger_accounts (account_type, currency)
			VALUES ($1, $2)
			ON CONFLICT (account_type, currency) WHERE account_type <> 'wallet'
			DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
			RETURNING id`,
			accountType, currency,
		).Scan(&id)
	}
	if err != nil {
		return "", err
	}
	return id, nil
}
