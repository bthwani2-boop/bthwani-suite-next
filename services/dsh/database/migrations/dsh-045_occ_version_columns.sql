-- DSH-045: OCC Version Columns
-- Add version column to all major entities for Optimistic Concurrency Control

ALTER TABLE dsh_catalog_domains ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_catalog_nodes ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_master_products ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_store_assortments ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_catalog_assets ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
