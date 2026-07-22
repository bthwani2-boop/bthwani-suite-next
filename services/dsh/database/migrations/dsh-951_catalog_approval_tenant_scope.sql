-- DSH-951: tenant isolation for the catalog approval queue.
-- Historical rows are assigned to a closed sentinel tenant and are never
-- returned by an authenticated tenant-scoped query.

ALTER TABLE dsh_catalog_approval_records
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE dsh_catalog_approval_records
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR BTRIM(tenant_id) = '';

ALTER TABLE dsh_catalog_approval_records
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE dsh_catalog_approval_records
  DROP CONSTRAINT IF EXISTS dsh_catalog_approval_records_tenant_id_nonempty;

ALTER TABLE dsh_catalog_approval_records
  ADD CONSTRAINT dsh_catalog_approval_records_tenant_id_nonempty
  CHECK (BTRIM(tenant_id) <> '');

DROP INDEX IF EXISTS idx_dsh_catalog_approval_records_owner;

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_tenant_owner
  ON dsh_catalog_approval_records (tenant_id, owner_actor_id, source, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_tenant_stage
  ON dsh_catalog_approval_records (tenant_id, stage, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_tenant_entity
  ON dsh_catalog_approval_records (tenant_id, entity_type, entity_id);
