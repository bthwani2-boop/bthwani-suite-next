package ledger

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"

	"wlt-api/internal/shared"
)

var ErrUnbalancedTransaction = errors.New("ledger transaction is not balanced")
var ErrLedgerReferenceConflict = errors.New("ledger reference already exists with a different posting payload")
var ErrLedgerOperatorContextConflict = errors.New("ledger reference does not belong to the trusted OperatorContext")

type LedgerLine struct {
	AccountType      string
	ActorType        string
	ActorID          string
	DebitCredit      string
	AmountMinorUnits int64
	Currency         string
}

type Actor struct {
	ID   string
	Type string
}

// resolveLedgerOperatorContext keeps request context as the primary OperatorContext
// authority. Refund compatibility calls may omit it only because WLT can derive
// the OperatorContext from its own persisted refund row. A supplied mismatched OperatorContext is
// always rejected; no local/default OperatorContext is invented.
func resolveLedgerOperatorContext(ctx context.Context, tx *sql.Tx, referenceType, referenceID string) (context.Context, string, error) {
	trustedOperatorContext, hasTrustedOperatorContext := shared.OperatorContextIDFromContext(ctx)
	if referenceType != "refund" {
		if !hasTrustedOperatorContext {
			_, err := shared.RequireOperatorContext(ctx)
			return ctx, "", err
		}
		return ctx, trustedOperatorContext, nil
	}

	var persistedOperatorContext string
	if err := tx.QueryRowContext(ctx, `SELECT operator_context_id FROM wlt_refunds WHERE id=$1`, referenceID).Scan(&persistedOperatorContext); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ctx, "", fmt.Errorf("refund ledger reference not found")
		}
		return ctx, "", fmt.Errorf("resolve refund ledger OperatorContext: %w", err)
	}
	persistedOperatorContext = strings.TrimSpace(persistedOperatorContext)
	if persistedOperatorContext == "" {
		return ctx, "", fmt.Errorf("refund ledger OperatorContext is missing")
	}
	if hasTrustedOperatorContext {
		if trustedOperatorContext != persistedOperatorContext {
			return ctx, "", ErrLedgerOperatorContextConflict
		}
		return ctx, trustedOperatorContext, nil
	}
	trustedCtx := shared.WithOperatorContext(ctx, persistedOperatorContext)
	return trustedCtx, persistedOperatorContext, nil
}

// PostLedgerTransaction is the only write path for the double-entry ledger.
// OperatorContext ownership comes from authenticated context. A refund-only compatibility
// seam may derive it from WLT's canonical refund row, never from caller input.
// Account identity, transaction idempotency and lines are all OperatorContext-scoped.
func PostLedgerTransaction(ctx context.Context, tx *sql.Tx, transactionType, referenceType, referenceID string, lines []LedgerLine, createdBy Actor) (string, error) {
	if transactionType == "" {
		return "", fmt.Errorf("transactionType is required")
	}
	if referenceType == "" || referenceID == "" {
		return "", fmt.Errorf("referenceType and referenceId are required")
	}
	trustedCtx, operatorContextID, err := resolveLedgerOperatorContext(ctx, tx, referenceType, referenceID)
	if err != nil {
		return "", err
	}
	ctx = trustedCtx
	if len(lines) < 2 {
		return "", fmt.Errorf("at least two ledger lines are required, got %d", len(lines))
	}

	totals := map[string]int64{}
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
	err = tx.QueryRowContext(ctx, `
		WITH inserted AS (
			INSERT INTO wlt_ledger_transactions
				(operator_context_id, transaction_type, reference_type, reference_id, created_by_actor_id, created_by_actor_type)
			VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''))
			ON CONFLICT (operator_context_id, transaction_type, reference_type, reference_id)
				WHERE reference_type <> '' AND reference_id <> ''
			DO NOTHING
			RETURNING id
		)
		SELECT id, true FROM inserted
		UNION ALL
		SELECT id, false
		FROM wlt_ledger_transactions
		WHERE operator_context_id = $1 AND transaction_type = $2 AND reference_type = $3 AND reference_id = $4
		ORDER BY 2 DESC
		LIMIT 1`,
		operatorContextID, transactionType, referenceType, referenceID, createdBy.ID, createdBy.Type,
	).Scan(&transactionID, &inserted)
	if err != nil {
		return "", fmt.Errorf("insert or resolve ledger transaction: %w", err)
	}

	if !inserted {
		if err := assertExistingTransactionMatches(ctx, tx, operatorContextID, transactionID, lines); err != nil {
			return "", err
		}
		return transactionID, nil
	}

	for _, line := range lines {
		accountID, err := getOrCreateAccountTx(ctx, tx, operatorContextID, line.AccountType, line.ActorType, line.ActorID, line.Currency)
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
			WHERE id = $2 AND operator_context_id = $3
			RETURNING balance_minor_units`,
			delta, accountID, operatorContextID,
		).Scan(&runningBalance)
		if err != nil {
			return "", fmt.Errorf("update OperatorContext account balance: %w", err)
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO wlt_ledger_lines
				(operator_context_id, ledger_transaction_id, account_id, debit_credit, amount_minor_units, currency, running_balance_after)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			operatorContextID, transactionID, accountID, line.DebitCredit, line.AmountMinorUnits, line.Currency, runningBalance,
		)
		if err != nil {
			return "", fmt.Errorf("insert OperatorContext ledger line: %w", err)
		}
	}

	return transactionID, nil
}

func assertExistingTransactionMatches(ctx context.Context, tx *sql.Tx, operatorContextID, transactionID string, expected []LedgerLine) error {
	rows, err := tx.QueryContext(ctx, `
		SELECT a.account_type,
		       COALESCE(a.actor_type, ''),
		       COALESCE(a.actor_id, ''),
		       l.debit_credit,
		       l.amount_minor_units,
		       l.currency
		FROM wlt_ledger_lines l
		JOIN wlt_ledger_accounts a ON a.id = l.account_id AND a.operator_context_id = l.operator_context_id
		JOIN wlt_ledger_transactions t ON t.id = l.ledger_transaction_id AND t.operator_context_id = l.operator_context_id
		WHERE l.operator_context_id = $1 AND l.ledger_transaction_id = $2`, operatorContextID, transactionID)
	if err != nil {
		return fmt.Errorf("read existing OperatorContext ledger transaction: %w", err)
	}
	defer rows.Close()

	actualKeys := make([]string, 0, len(expected))
	for rows.Next() {
		var line LedgerLine
		if err := rows.Scan(&line.AccountType, &line.ActorType, &line.ActorID, &line.DebitCredit, &line.AmountMinorUnits, &line.Currency); err != nil {
			return fmt.Errorf("scan existing OperatorContext ledger transaction: %w", err)
		}
		actualKeys = append(actualKeys, ledgerLineKey(line))
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read existing OperatorContext ledger lines: %w", err)
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

func getOrCreateAccountTx(ctx context.Context, tx *sql.Tx, operatorContextID, accountType, actorType, actorID, currency string) (string, error) {
	var id string
	var err error
	if accountType == "wallet" {
		err = tx.QueryRowContext(ctx, `
			SELECT id FROM wlt_ledger_accounts
			WHERE operator_context_id = $1 AND account_type = 'wallet' AND actor_type = $2 AND actor_id = $3 AND currency = $4`,
			operatorContextID, actorType, actorID, currency,
		).Scan(&id)
	} else {
		err = tx.QueryRowContext(ctx, `
			SELECT id FROM wlt_ledger_accounts
			WHERE operator_context_id = $1 AND account_type = $2 AND currency = $3 AND actor_id IS NULL`,
			operatorContextID, accountType, currency,
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
			INSERT INTO wlt_ledger_accounts (operator_context_id, account_type, actor_type, actor_id, currency)
			VALUES ($1, 'wallet', $2, $3, $4)
			ON CONFLICT (operator_context_id, account_type, actor_type, actor_id, currency) WHERE account_type = 'wallet'
			DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
			RETURNING id`,
			operatorContextID, actorType, actorID, currency,
		).Scan(&id)
	} else {
		err = tx.QueryRowContext(ctx, `
			INSERT INTO wlt_ledger_accounts (operator_context_id, account_type, currency)
			VALUES ($1, $2, $3)
			ON CONFLICT (operator_context_id, account_type, currency) WHERE account_type <> 'wallet'
			DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
			RETURNING id`,
			operatorContextID, accountType, currency,
		).Scan(&id)
	}
	if err != nil {
		return "", err
	}
	return id, nil
}
