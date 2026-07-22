-- DSH-950: fail-closed actor ownership for the catalog approval queue.
-- Existing pre-scope records remain administration-only under a sentinel owner;
-- all new records must carry the authenticated actor id.

ALTER TABLE dsh_catalog_approval_records
  ADD COLUMN IF NOT EXISTS owner_actor_id TEXT;

UPDATE dsh_catalog_approval_records
SET owner_actor_id = 'legacy-unowned'
WHERE owner_actor_id IS NULL OR BTRIM(owner_actor_id) = '';

ALTER TABLE dsh_catalog_approval_records
  ALTER COLUMN owner_actor_id SET NOT NULL;

ALTER TABLE dsh_catalog_approval_records
  DROP CONSTRAINT IF EXISTS dsh_catalog_approval_records_owner_actor_id_nonempty;

ALTER TABLE dsh_catalog_approval_records
  ADD CONSTRAINT dsh_catalog_approval_records_owner_actor_id_nonempty
  CHECK (BTRIM(owner_actor_id) <> '');

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_owner
  ON dsh_catalog_approval_records (owner_actor_id, source, submitted_at DESC);
