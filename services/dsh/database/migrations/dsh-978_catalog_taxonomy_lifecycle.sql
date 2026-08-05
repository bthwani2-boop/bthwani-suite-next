BEGIN;

ALTER TABLE dsh_catalog_nodes 
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active', 'deprecated', 'merged'));

ALTER TABLE dsh_catalog_nodes 
  ADD COLUMN IF NOT EXISTS merged_into_id TEXT REFERENCES dsh_catalog_nodes(id);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_nodes_lifecycle 
  ON dsh_catalog_nodes (lifecycle_status);

COMMIT;
