package ledger

import (
	"context"
	"database/sql"
	"fmt"

	"wlt-api/internal/shared"
)

// ErrNonPositiveAmount is returned when an opening balance amount is not
// positive. Zero is not a meaningful financial fact and is rejected rather
// than posted as a no-op transaction that would still consume a reference.
var ErrNonPositiveAmount = fmt.Errorf("amount must be a positive number of minor units")

// ErrZeroCorrection is returned when a financial correction's delta is zero.
// A zero-delta correction has no financial effect and would only consume a
// reference without recording anything a reader could act on.
var ErrZeroCorrection = fmt.Errorf("financial correction delta must not be zero")

// PostOpeningBalance establishes an actor's starting wallet position as a
// typed, idempotent ledger transaction rather than a direct balance write.
func PostOpeningBalance(ctx context.Context, tx *sql.Tx, actorType, actorID, currency string, amountMinorUnits int64, referenceID string, createdBy Actor) (string, error) {
	if amountMinorUnits <= 0 {
		return "", ErrNonPositiveAmount
	}
	if actorType == "" || actorID == "" {
		return "", fmt.Errorf("actorType and actorId are required")
	}
	if referenceID == "" {
		return "", fmt.Errorf("referenceId is required for an idempotent opening balance")
	}
	lines := []LedgerLine{
		{AccountType: "platform_capital_contribution", DebitCredit: "debit", AmountMinorUnits: amountMinorUnits, Currency: currency},
		{AccountType: "wallet", ActorType: actorType, ActorID: actorID, DebitCredit: "credit", AmountMinorUnits: amountMinorUnits, Currency: currency},
	}
	return PostLedgerTransaction(ctx, tx, "opening_balance", "wallet_opening_balance", referenceID, lines, createdBy)
}

// PostFinancialCorrection posts a compensating adjustment to an actor's
// wallet. deltaMinorUnits is signed and every correction is a new balanced
// transaction; existing ledger history is never rewritten.
func PostFinancialCorrection(ctx context.Context, tx *sql.Tx, actorType, actorID, currency string, deltaMinorUnits int64, referenceID, reason string, createdBy Actor) (string, error) {
	if deltaMinorUnits == 0 {
		return "", ErrZeroCorrection
	}
	if actorType == "" || actorID == "" {
		return "", fmt.Errorf("actorType and actorId are required")
	}
	if referenceID == "" {
		return "", fmt.Errorf("referenceId is required for an idempotent financial correction")
	}
	if reason == "" {
		return "", fmt.Errorf("reason is required for a financial correction")
	}

	amount := deltaMinorUnits
	walletSide := "credit"
	contributionSide := "debit"
	if deltaMinorUnits < 0 {
		amount = -deltaMinorUnits
		walletSide = "debit"
		contributionSide = "credit"
	}

	lines := []LedgerLine{
		{AccountType: "platform_capital_contribution", DebitCredit: contributionSide, AmountMinorUnits: amount, Currency: currency},
		{AccountType: "wallet", ActorType: actorType, ActorID: actorID, DebitCredit: walletSide, AmountMinorUnits: amount, Currency: currency},
	}
	return PostLedgerTransaction(ctx, tx, "financial_correction", "wallet_financial_correction", referenceID, lines, createdBy)
}

// WalletLedgerProjection is the canonical, OperatorContext-scoped economic
// balance of one wallet account. wlt_ledger_accounts stores debit-minus-credit
// running totals, while wallet is credit-normal, so BalanceMinorUnits is the
// negated raw ledger-account balance.
type WalletLedgerProjection struct {
	OperatorContextID string `json:"operatorContextId"`
	ActorType         string `json:"actorType"`
	ActorID           string `json:"actorId"`
	Currency          string `json:"currency"`
	BalanceMinorUnits int64  `json:"balanceMinorUnits"`
}

type walletProjectionQueryer interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

// GetWalletLedgerProjection reads the canonical wallet balance only inside the
// authenticated OperatorContext. It returns (nil, nil) when no canonical
// account exists. There is intentionally no unscoped compatibility fallback.
func GetWalletLedgerProjection(ctx context.Context, q walletProjectionQueryer, actorType, actorID, currency string) (*WalletLedgerProjection, error) {
	operatorContextID, err := shared.RequireOperatorContext(ctx)
	if err != nil {
		return nil, err
	}
	if q == nil {
		return nil, fmt.Errorf("wallet ledger projection queryer is required")
	}
	if actorType == "" || actorID == "" || currency == "" {
		return nil, fmt.Errorf("actorType, actorId and currency are required")
	}
	walletTaxonomy, err := resolveAccountTaxonomy("wallet")
	if err != nil {
		return nil, fmt.Errorf("wallet account type is not classified: %w", err)
	}

	var rawBalance int64
	err = q.QueryRowContext(ctx, `
		SELECT balance_minor_units
		FROM wlt_ledger_accounts
		WHERE operator_context_id = $1
		  AND account_type = 'wallet'
		  AND actor_type = $2
		  AND actor_id = $3
		  AND currency = $4`,
		operatorContextID, actorType, actorID, currency,
	).Scan(&rawBalance)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read OperatorContext wallet ledger projection: %w", err)
	}

	balance := rawBalance
	if walletTaxonomy.NormalBalanceSide == "credit" {
		balance = -rawBalance
	}
	return &WalletLedgerProjection{
		OperatorContextID: operatorContextID,
		ActorType:         actorType,
		ActorID:           actorID,
		Currency:          currency,
		BalanceMinorUnits: balance,
	}, nil
}
