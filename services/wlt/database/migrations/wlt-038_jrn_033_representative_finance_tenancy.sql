-- WLT-038 / JRN-033: OperatorContext isolation for representative wallets and the
-- legacy actor ledger read model. Existing rows cannot be assigned to a real
-- OperatorContext without evidence, so they are explicitly marked legacy-unscoped.
-- Local runtime seeds and all new governed DSH reads use the authenticated
-- Identity OperatorContext (for example local-dsh).

ALTER TABLE wlt_wallets
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_wallets
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_wallets
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_wallets_OperatorContext_actor_idx
  ON wlt_wallets (operator_context_id, actor_type, actor_id, updated_at DESC);

ALTER TABLE wlt_ledger_entries
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_ledger_entries
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_ledger_entries
  ALTER COLUMN operator_context_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN operator_context_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_ledger_entries_OperatorContext_actor_idx
  ON wlt_ledger_entries (operator_context_id, actor_type, actor_id, created_at DESC);
