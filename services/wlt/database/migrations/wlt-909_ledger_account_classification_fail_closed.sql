-- WLT-909: correct account classification drift and extend the closed chart
-- for external settlement cash and payment processing expense.
--
-- Two account-classification sources had drifted apart:
--   - kernel_read.go's accountTypeMetadata (used to build financial summaries)
--     has always treated cash_in_transit as an asset: captain-held COD cash on
--     its way to the platform.
--   - the classification persisted by getOrCreateAccountTx at posting time
--     (wlt-116) fell through its unmapped default and stored cash_in_transit
--     as a liability instead.
--
-- The read side has been the de facto authority since it is what finance
-- summaries have shown; this migration brings the persisted column into
-- agreement with it. The Go account taxonomy introduced alongside this
-- migration is now a single fail-closed map shared by both the write and read
-- paths, so this kind of drift cannot recur silently.

BEGIN;

UPDATE wlt_ledger_accounts
SET classification = 'asset'
WHERE account_type = 'cash_in_transit'
  AND classification <> 'asset';

ALTER TABLE wlt_ledger_accounts
  DROP CONSTRAINT IF EXISTS wlt_ledger_accounts_type_chk;

-- external_settlement_cash: the platform's own cash position at an official
-- settlement destination once a manual transfer executes -- an asset.
-- payment_processing_expense: fees the platform pays a Cash-In provider to
-- process a movement -- an expense, distinct from provider_clearing (which is
-- the in-flight receivable, not a cost).
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
      'payment_processing_expense'
    )
  );

COMMENT ON CONSTRAINT wlt_ledger_accounts_type_chk ON wlt_ledger_accounts IS
  'Closed WLT chart subset including official-wallet external settlement cash and payment processing expense.';

COMMIT;
