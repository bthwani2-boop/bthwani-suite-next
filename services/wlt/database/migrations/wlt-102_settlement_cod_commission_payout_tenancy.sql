-- WLT-102: OperatorContext isolation for settlements, COD records, commissions and
-- payout requests. Existing rows cannot be assigned to a real OperatorContext without
-- evidence, so they are explicitly marked legacy-unscoped, following the
-- same backfill pattern as wlt-038 (wlt_wallets / wlt_ledger_entries).

ALTER TABLE wlt_settlements
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_settlements
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_settlements
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_settlements_OperatorContext_partner_idx
  ON wlt_settlements (operator_context_id, partner_id, period_start DESC);

ALTER TABLE wlt_cod_records
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_cod_records
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_cod_records
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_cod_records_OperatorContext_partner_idx
  ON wlt_cod_records (operator_context_id, partner_id, created_at DESC);

ALTER TABLE wlt_commissions
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_commissions
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_commissions
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_commissions_OperatorContext_beneficiary_idx
  ON wlt_commissions (operator_context_id, beneficiary_actor_id, created_at DESC);

ALTER TABLE wlt_payout_requests
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_payout_requests
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_payout_requests
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_payout_requests_OperatorContext_beneficiary_idx
  ON wlt_payout_requests (operator_context_id, beneficiary_actor_id, requested_at DESC);
