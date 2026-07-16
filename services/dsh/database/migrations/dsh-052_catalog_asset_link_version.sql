-- DSH-052: Add OCC versioning to catalog asset links.
--
-- Runtime image replacement already treats asset links as versioned rows when
-- flipping the primary link for an entity. This column brings the schema in
-- line with the central catalog repository contract.

ALTER TABLE dsh_catalog_asset_links
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
