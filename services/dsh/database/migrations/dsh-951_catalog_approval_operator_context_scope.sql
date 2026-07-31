-- DSH-951: OperatorContext isolation for the catalog approval queue.
-- Historical rows are assigned to a closed sentinel OperatorContext and are never
-- returned by an authenticated OperatorContext-scoped query.

ALTER TABLE dsh_catalog_approval_records
  ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_catalog_approval_records
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL OR BTRIM(operator_context_id) = '';

ALTER TABLE dsh_catalog_approval_records
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE dsh_catalog_approval_records
  DROP CONSTRAINT IF EXISTS dsh_catalog_approval_records_operator_context_id_nonempty;

ALTER TABLE dsh_catalog_approval_records
  ADD CONSTRAINT dsh_catalog_approval_records_operator_context_id_nonempty
  CHECK (BTRIM(operator_context_id) <> '');

DROP INDEX IF EXISTS idx_dsh_catalog_approval_records_owner;

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_OperatorContext_owner
  ON dsh_catalog_approval_records (operator_context_id, owner_actor_id, source, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_OperatorContext_stage
  ON dsh_catalog_approval_records (operator_context_id, stage, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_OperatorContext_entity
  ON dsh_catalog_approval_records (operator_context_id, entity_type, entity_id);
