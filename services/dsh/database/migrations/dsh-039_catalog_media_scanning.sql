
-- DSH-039: Media Scanning Lifecycle States
-- Extends the asset status enum to include scanning and quarantined.

ALTER TABLE dsh_catalog_assets DROP CONSTRAINT IF EXISTS dsh_catalog_assets_status_check;

ALTER TABLE dsh_catalog_assets ADD CONSTRAINT dsh_catalog_assets_status_check 
  CHECK (status IN ('draft', 'uploaded', 'scanning', 'quarantined', 'pending_review', 'approved', 'rejected', 'archived'));
