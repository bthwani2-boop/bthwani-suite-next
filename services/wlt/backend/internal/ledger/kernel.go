package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
)

// ErrUnbalancedTransaction is returned when the supplied lines' debits and
// credits do not net to zero for every currency involved.
var ErrUnbalancedTransaction = errors.New("ledger transaction is not balanced")

// ErrLedgerReferenceConflict is returned when a previously posted financial
// reference is retried with a different set of journal lines. Returning the
// existing transaction is safe only when the complete posting payload matches.
var ErrLedgerReferenceConflict = errors.New("ledger reference already exists with a different posting payload")

// LedgerLine describes one leg of a ledger transaction. A transaction must
// contain at least two lines and may contain any number of additional legs,
// provided debits equal credits independently for every currency.
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
// kernel. It must be called with the same transaction used by the caller for
// the associated business-state change, so status and accounting truth commit
// or roll back together.
//
// The source tuple (transactionType, referenceType, referenceID) is the
// idempotency identity. A retry with identical lines returns the original
// transaction ID without moving balances again. A retry with different lines
// fails with ErrLedgerReferenceConflict.
func PostLedgerTransaction(ctx context.Context, tx *sql.Tx, transactionType, referenceType, referenceID string, lines []LedgerLine, createdBy Actor) (string, error) {
	if transactionType == "" {
		return "", fmt.Errorf("transactionType is required")
	}
	if referenceType == "" || referenceID == "" {
		return "", fmt.Errorf("referenceType and referenceId are required")
	}
	if len(lines) < 2 {
		return "", fmt.Errorf("at least two ledger lines are required, got %d", len(lines))
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
		if line.AccountType != "wallet" && (line.ActorType != "" || line.ActorID != "") {
			return "", fmt.Errorf("line %d: actorType and actorId are only valid for wallet accounts", i)
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
	var inserted bool
	err := tx.QueryRowContext(ctx, `
		WITH inserted AS (
			INSERT INTO wlt_ledger_transactions
				(transaction_type, reference_type, reference_id, created_by_actor_id, created_by_actor_type)
			VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''))
			ON CONFLICT DO NOTHING
			RETURNING id
		)
		SELECT id, true FROM inserted
		UNION ALL
		SELECT id, false
		FROM wlt_ledger_transactions
		WHERE transaction_type = $1 AND reference_type = $2 AND reference_id = $3
		ORDER BY 2 DESC
		LIMIT 1`,
		transactionType, referenceType, referenceID, createdBy.ID, createdBy.Type,
	).Scan(&transactionID, &inserted)
	if err != nil {
		return "", fmt.Errorf("insert or resolve ledger transaction: %w", err)
	}

	if !inserted {
		if err := assertExistingTransactionMatches(ctx, tx, transactionID, lines); err != nil {
			return "", err
		}
		return transactionID, nil
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

func assertExistingTransactionMatches(ctx context.Context, tx *sql.Tx, transactionID string, expected []LedgerLine) error {
	rows, err := tx.QueryContext(ctx, `
		SELECT a.account_type,
		       COALESCE(a.actor_type, ''),
		       COALESCE(a.actor_id, ''),
		       l.debit_credit,
		       l.amount_minor_units,
		       l.currency
		FROM wlt_ledger_lines l
		JOIN wlt_ledger_accounts a ON a.id = l.account_id
		WHERE l.ledger_transaction_id = $1`, transactionID)
	if err != nil {
		return fmt.Errorf("read existing ledger transaction: %w", err)
	}
	defer rows.Close()

	actualKeys := make([]string, 0, len(expected))
	for rows.Next() {
		var line LedgerLine
		if err := rows.Scan(&line.AccountType, &line.ActorType, &line.ActorID, &line.DebitCredit, &line.AmountMinorUnits, &line.Currency); err != nil {
			return fmt.Errorf("scan existing ledger line: %w", err)
		}
		actualKeys = append(actualKeys, ledgerLineKey(line))
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read existing ledger lines: %w", err)
	}

	expectedKeys := make([]string, 0, len(expected))
	for _, line := range expected {
		expectedKeys = append(expectedKeys, ledgerLineKey(line))
	}
	sort.Strings(actualKeys)
	sort.Strings(expectedKeys)
	if len(actualKeys) != len(expectedKeys) {
		return fmt.Errorf("%w: transaction %s line count differs", ErrLedgerReferenceConflict, transactionID)
	}
	for i := range actualKeys {
		if actualKeys[i] != expectedKeys[i] {
			return fmt.Errorf("%w: transaction %s line %d differs", ErrLedgerReferenceConflict, transactionID, i)
		}
	}
	return nil
}

func ledgerLineKey(line LedgerLine) string {
	return fmt.Sprintf("%s\x1f%s\x1f%s\x1f%s\x1f%d\x1f%s", line.AccountType, line.ActorType, line.ActorID, line.DebitCredit, line.AmountMinorUnits, line.Currency)
}

// getOrCreateAccountTx resolves the account row for a line. Existing balances
// are mutated only through atomic UPDATE ... RETURNING statements, so concurrent
// postings cannot lose updates.
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
