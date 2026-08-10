-- WLT-910: platform_capital_contribution account for opening balances and
-- financial corrections (U001-T003).
--
-- Every wallet credit/debit posted through PostLedgerTransaction already
-- requires a balancing line. Opening balances and corrections have no
-- provider, commission or payout counterpart to balance against -- they are
-- either a deliberate business decision to establish a starting position, or
-- a deliberate fix to a proven error. platform_capital_contribution is that
-- counterpart: an asset-classified account representing the platform's
-- recorded claim against the value it committed, following the same pattern
-- already used for platform_commission_receivable rather than inventing a
-- new equity reporting category this migration would then have to wire
-- through FinancialSummary's CurrencySummary shape.

BEGIN;

ALTER TABLE wlt_ledger_accounts
  DROP CONSTRAINT IF EXISTS wlt_ledger_accounts_type_chk;

ALTER TABLE wlt_ledger_accounts
  ADD CONSTRAINT wlt_ledger_accounts_type_chk CHECK (
    account_type IN (
      'wallet',
      'platform_revenue',
      'platform_payable',
      'provider_clearing',
      'cash_in_transit',
      'cash_variance',
      'platform_commission_receivable',
      'external_settlement_cash',
      'payment_processing_expense',
      'platform_capital_contribution'
    )
  );

COMMENT ON CONSTRAINT wlt_ledger_accounts_type_chk ON wlt_ledger_accounts IS
  'Closed WLT chart subset including the capital-contribution counterpart for opening balances and financial corrections.';

COMMIT;
