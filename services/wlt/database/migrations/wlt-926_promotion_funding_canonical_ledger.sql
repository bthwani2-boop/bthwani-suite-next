-- WLT-926: promotion-funding commitment and reversal must be canonical
-- double-entry ledger facts, not state-only lifecycle markers.
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
      'platform_capital_contribution',
      'promotion_funding_expense',
      'partner_promotion_receivable'
    )
  );

ALTER TABLE wlt_promotion_funding_reservations
  ADD COLUMN IF NOT EXISTS commit_ledger_transaction_id TEXT
    REFERENCES wlt_ledger_transactions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reversal_ledger_transaction_id TEXT
    REFERENCES wlt_ledger_transactions(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_promotion_funding_commit_ledger_uq
  ON wlt_promotion_funding_reservations (commit_ledger_transaction_id)
  WHERE commit_ledger_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_promotion_funding_reversal_ledger_uq
  ON wlt_promotion_funding_reservations (reversal_ledger_transaction_id)
  WHERE reversal_ledger_transaction_id IS NOT NULL;

ALTER TABLE wlt_promotion_funding_reservations
  ADD CONSTRAINT wlt_promotion_funding_ledger_lifecycle_chk CHECK (
    (status IN ('reserved', 'released')
      AND commit_ledger_transaction_id IS NULL
      AND reversal_ledger_transaction_id IS NULL)
    OR
    (status = 'committed'
      AND commit_ledger_transaction_id IS NOT NULL
      AND reversal_ledger_transaction_id IS NULL)
    OR
    (status = 'reversed'
      AND commit_ledger_transaction_id IS NOT NULL
      AND reversal_ledger_transaction_id IS NOT NULL)
  ) NOT VALID;

COMMENT ON CONSTRAINT wlt_promotion_funding_ledger_lifecycle_chk
  ON wlt_promotion_funding_reservations IS
  'New promotion-funding lifecycle changes require their immutable canonical ledger facts; historical rows remain readable.';

COMMIT;
