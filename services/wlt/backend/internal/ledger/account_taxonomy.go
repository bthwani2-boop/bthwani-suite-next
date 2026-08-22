package ledger

import "fmt"

// accountTaxonomyEntry is the one place an account_type's accounting meaning
// is decided. Both the write path (getOrCreateAccountTx, which persists
// Classification into wlt_ledger_accounts.classification) and the read path
// (BuildFinancialSummary, which derives Category/NormalBalanceSide for
// reporting) resolve every account_type through this same table.
//
// Before this file existed, kernel.go and kernel_read.go each carried their
// own account-type map and had drifted apart: cash_in_transit read as an
// asset in financial summaries but posted as a liability (kernel.go's
// unmapped-default branch). Ledger accounts persist the account_type they
// were created with for life, so wlt-909 backfills the one account_type that
// had already drifted; from here forward a single source makes that specific
// failure mode structurally impossible, and any wholly new account_type is
// rejected rather than silently defaulted.
type accountTaxonomyEntry struct {
	// Classification is the exact value persisted to
	// wlt_ledger_accounts.classification and constrained by that column's
	// CHECK (asset | liability | equity | income | expense).
	Classification string
	// Category is the reporting-facing label used in FinancialSummary JSON.
	// It predates this file and uses "revenue" where Classification uses
	// "income" for the same accounts; kept as-is to avoid an API contract
	// change outside this unit's scope.
	Category string
	// NormalBalanceSide is which side (debit|credit) increases this account,
	// used by BuildFinancialSummary to sign a raw debit/credit total into a
	// balance.
	NormalBalanceSide string
}

// accountTaxonomy is the closed chart of accounts. An account_type absent
// here is not postable and not summarisable, regardless of what the database
// CHECK constraint (wlt_ledger_accounts_type_chk) separately permits -- the
// CHECK is a broad outer bound; this map is the actual accounting authority.
//
// cash_variance is intentionally not listed: it has never been posted by any
// caller and has no established accounting treatment (asset recovery vs.
// expensed loss depends on policy this unit does not own). Leaving it absent
// means a future attempt to post it fails closed with ErrUnknownAccountType
// until its owning unit adds a deliberate, evidenced entry -- which is
// strictly safer than the silent liability default it would previously have
// received.
var accountTaxonomy = map[string]accountTaxonomyEntry{
	"wallet":                         {Classification: "liability", Category: "liability", NormalBalanceSide: "credit"},
	"platform_payable":               {Classification: "liability", Category: "liability", NormalBalanceSide: "credit"},
	"platform_revenue":               {Classification: "income", Category: "revenue", NormalBalanceSide: "credit"},
	"provider_clearing":              {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
	"provider_receivable":            {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
	"platform_commission_receivable": {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
	// Historical-only account retained so old cash-custody ledger rows remain
	// correctly readable after the captain-funded COD cutover. New postings are
	// rejected by PostLedgerTransaction and the database write fence.
	"cash_in_transit": {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
	// New in wlt-909, for U001-T002.
	"external_settlement_cash":   {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
	"payment_processing_expense": {Classification: "expense", Category: "expense", NormalBalanceSide: "debit"},
	// Promotion funding is an actual cost (or a recoverable partner-funded
	// amount), not merely a lifecycle marker. Keeping these accounts separate
	// prevents a discount from silently reducing an unrelated revenue balance.
	"promotion_funding_expense":    {Classification: "expense", Category: "expense", NormalBalanceSide: "debit"},
	"partner_promotion_receivable": {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
	// New in wlt-910, for U001-T003: the balancing counterpart for opening
	// balances and financial corrections. See PostOpeningBalance and
	// PostFinancialCorrection in opening_balance.go.
	"platform_capital_contribution": {Classification: "asset", Category: "asset", NormalBalanceSide: "debit"},
}

// ErrUnknownAccountType is returned when a caller (or a future migration
// that forgets to update accountTaxonomy) tries to post or resolve an
// account_type this map does not recognise. There is deliberately no
// default-to-liability fallback: an unclassified account must block the
// posting rather than land in a plausible-looking but unproven category.
var ErrUnknownAccountType = fmt.Errorf("account_type is not in the closed WLT chart of accounts")

// resolveAccountTaxonomy looks up accountType's entry, fail-closed.
func resolveAccountTaxonomy(accountType string) (accountTaxonomyEntry, error) {
	entry, ok := accountTaxonomy[accountType]
	if !ok {
		return accountTaxonomyEntry{}, fmt.Errorf("%w: %q", ErrUnknownAccountType, accountType)
	}
	return entry, nil
}
