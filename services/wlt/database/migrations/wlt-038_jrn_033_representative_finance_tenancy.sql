-- WLT-038 / JRN-033: tenant isolation for representative wallets and the
-- legacy actor ledger read model. Existing rows cannot be assigned to a real
-- tenant without evidence, so they are explicitly marked legacy-unscoped.
-- Local runtime seeds and all new governed DSH reads use the authenticated
-- Identity tenant (for example local-dsh).

ALTER TABLE wlt_wallets
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_wallets
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_wallets
  ALTER COLUMN tenant_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_wallets_tenant_actor_idx
  ON wlt_wallets (tenant_id, actor_type, actor_id, updated_at DESC);

ALTER TABLE wlt_ledger_entries
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_ledger_entries
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_ledger_entries
  ALTER COLUMN tenant_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_ledger_entries_tenant_actor_idx
  ON wlt_ledger_entries (tenant_id, actor_type, actor_id, created_at DESC);
