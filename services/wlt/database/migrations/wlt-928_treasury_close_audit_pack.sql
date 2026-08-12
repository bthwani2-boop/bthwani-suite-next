-- WLT-928: bind daily finance close to the authoritative treasury proof.
-- Historical close rows remain readable; every new close carries all three
-- balances and the number of settlement audit packs included in the close.

BEGIN;

ALTER TABLE wlt_daily_finance_close
  ADD COLUMN IF NOT EXISTS treasury_expected_balance_minor_units bigint,
  ADD COLUMN IF NOT EXISTS treasury_statement_balance_minor_units bigint,
  ADD COLUMN IF NOT EXISTS treasury_ledger_balance_minor_units bigint,
  ADD COLUMN IF NOT EXISTS settlement_audit_pack_count integer;

ALTER TABLE wlt_settlement_audit_packs
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_settlement_audit_packs p
SET operator_context_id = b.operator_context_id
FROM wlt_settlement_batches b
WHERE b.id = p.batch_id
  AND (p.operator_context_id IS NULL OR btrim(p.operator_context_id) = '');

ALTER TABLE wlt_settlement_audit_packs
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_settlement_audit_packs_close_idx
  ON wlt_settlement_audit_packs (operator_context_id, created_at DESC);

COMMENT ON COLUMN wlt_daily_finance_close.treasury_expected_balance_minor_units IS
  'Opening external-provider balance plus immutable statement movements through the business date.';
COMMENT ON COLUMN wlt_daily_finance_close.treasury_statement_balance_minor_units IS
  'Closing balance reported by the authoritative provider statements for the business date.';
COMMENT ON COLUMN wlt_daily_finance_close.treasury_ledger_balance_minor_units IS
  'Canonical WLT external_settlement_cash balance at the close.';

COMMIT;
