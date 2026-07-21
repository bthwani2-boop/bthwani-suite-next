-- WLT-026: sovereign cash-in-transit account for COD custody.
--
-- Collection moves value from platform payable into cash held by captains.
-- Remittance moves that cash into provider/bank clearing. This account keeps
-- those two operational moments distinct and reconcilable.

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
      'platform_commission_receivable'
    )
  );

COMMENT ON CONSTRAINT wlt_ledger_accounts_type_chk ON wlt_ledger_accounts IS
  'Closed WLT chart subset including cash held by captains before COD remittance.';
