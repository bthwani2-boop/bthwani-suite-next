-- WLT-102: tenant isolation for settlements, COD records, commissions and
-- payout requests. Existing rows cannot be assigned to a real tenant without
-- evidence, so they are explicitly marked legacy-unscoped, following the
-- same backfill pattern as wlt-038 (wlt_wallets / wlt_ledger_entries).

ALTER TABLE wlt_settlements
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_settlements
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_settlements
  ALTER COLUMN tenant_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_settlements_tenant_partner_idx
  ON wlt_settlements (tenant_id, partner_id, period_start DESC);

ALTER TABLE wlt_cod_records
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_cod_records
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_cod_records
  ALTER COLUMN tenant_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_cod_records_tenant_partner_idx
  ON wlt_cod_records (tenant_id, partner_id, created_at DESC);

ALTER TABLE wlt_commissions
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_commissions
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_commissions
  ALTER COLUMN tenant_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_commissions_tenant_beneficiary_idx
  ON wlt_commissions (tenant_id, beneficiary_actor_id, created_at DESC);

ALTER TABLE wlt_payout_requests
  ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE wlt_payout_requests
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';

ALTER TABLE wlt_payout_requests
  ALTER COLUMN tenant_id SET DEFAULT 'legacy-unscoped',
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_payout_requests_tenant_beneficiary_idx
  ON wlt_payout_requests (tenant_id, beneficiary_actor_id, requested_at DESC);
