package ledger

import (
	"context"
	"database/sql"
	"fmt"
)

// ErrNonPositiveAmount is returned when an opening balance amount is not
// positive. Zero is not a meaningful financial fact and is rejected rather
// than posted as a no-op transaction that would still consume a reference.
var ErrNonPositiveAmount = fmt.Errorf("amount must be a positive number of minor units")

// ErrZeroCorrection is returned when a financial correction's delta is zero.
// A zero-delta correction has no financial effect and would only consume an
// idempotency reference without recording anything a reader could act on.
var ErrZeroCorrection = fmt.Errorf("financial correction delta must not be zero")

// PostOpeningBalance establishes an actor's starting wallet position as a
// typed, idempotent ledger transaction rather than a direct balance write.
// referenceID is the idempotency key: retrying the same referenceID with the
// same actor/currency/amount returns the original transaction (see
// PostLedgerTransaction's existing reference-conflict handling); retrying it
// with a different amount is rejected as a payload conflict rather than
// silently accepted.
//
// The balancing line posts against platform_capital_contribution, an asset
// account representing the platform's recorded claim for the value it
// committed. This keeps every wallet credit traceable to a specific typed
// source, which is what "no financial amount appears without a source
// transaction" means in practice.
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
// wallet. deltaMinorUnits is signed: positive increases the wallet (a
// correction that credits value the actor was owed), negative decreases it
// (a correction that reverses value that should not have posted). Either
// direction is itself a new ledger transaction referencing what it corrects;
// this function has no path that edits or removes an existing ledger line,
// which is what makes it a compensating entry rather than a rewrite of
// history.
//
// referenceID must be distinct from the transaction being corrected (and
// from any other correction) -- PostLedgerTransaction's idempotency is keyed
// on (operatorContext, transactionType, referenceType, referenceID), so
// reusing the original reference here would either conflict or, worse,
// silently collapse two different financial facts into one.
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

// WalletLedgerProjection is a read-only view derived entirely from
// wlt_ledger_accounts.balance_minor_units -- the same column every posting in
// this package updates -- so it cannot drift from the ledger by construction.
// It intentionally does not read or touch wlt_wallets: that table's
// available/pending/held/earned/settled projections remain owned by the COD
// and payout units (U003/U004) that write it, and migrating those writers is
// out of scope for this unit.
type WalletLedgerProjection struct {
	ActorType         string `json:"actorType"`
	ActorID           string `json:"actorId"`
	Currency          string `json:"currency"`
	BalanceMinorUnits int64  `json:"balanceMinorUnits"`
}

// GetWalletLedgerProjection reads an actor's canonical ledger wallet balance.
// It returns (nil, nil) when no wallet account has been created yet for this
// actor/currency -- that is a legitimate "no activity" state, not an error.
//
// wlt_ledger_accounts.balance_minor_units is stored raw as (sum of debits -
// sum of credits) for every account regardless of its classification -- that
// is what PostLedgerTransaction's `if DebitCredit == "credit" { delta = -delta }`
// actually accumulates. A wallet is classified liability with a credit
// normal balance side (crediting it, e.g. a top-up, is what increases it),
// so its raw column is the negative of the economically meaningful balance:
// funding a wallet with 10000 leaves balance_minor_units at -10000. This
// function is what makes that reinterpretation happen once, in the one place
// a caller reads a wallet balance, instead of leaving every caller to
// rediscover BuildFinancialSummary's same sign convention independently.
func GetWalletLedgerProjection(db *sql.DB, actorType, actorID, currency string) (*WalletLedgerProjection, error) {
	if actorType == "" || actorID == "" || currency == "" {
		return nil, fmt.Errorf("actorType, actorId and currency are required")
	}
	walletTaxonomy, err := resolveAccountTaxonomy("wallet")
	if err != nil {
		// wallet is always registered in accountTaxonomy; this branch exists
		// only so a future refactor that removed it fails loudly here instead
		// of silently reporting an inverted balance.
		return nil, fmt.Errorf("wallet account type is not classified: %w", err)
	}

	var rawBalance int64
	err = db.QueryRow(`
		SELECT balance_minor_units
		FROM wlt_ledger_accounts
		WHERE account_type = 'wallet' AND actor_type = $1 AND actor_id = $2 AND currency = $3`,
		actorType, actorID, currency,
	).Scan(&rawBalance)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read wallet ledger projection: %w", err)
	}

	balance := rawBalance
	if walletTaxonomy.NormalBalanceSide == "credit" {
		balance = -rawBalance
	}
	return &WalletLedgerProjection{ActorType: actorType, ActorID: actorID, Currency: currency, BalanceMinorUnits: balance}, nil
}
