-- DSH-044: Catalog concurrency, data backfill, and constraint preflight

-- 1. Change default status of store domains
ALTER TABLE dsh_store_catalog_domains ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Backfill existing stores to their assigned catalog domain
INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_by, approved_at)
SELECT id, catalog_domain_id, 'approved', 'system_migration_backfill', NOW()
FROM dsh_stores
WHERE catalog_domain_id IS NOT NULL
ON CONFLICT (store_id, domain_id) DO NOTHING;

-- 3. Preflight deduplication for barcodes, GTIN, and SKU
-- We append a quarantine suffix to duplicates so the unique indexes can be created safely.
UPDATE dsh_master_products
SET barcode = barcode || '-quarantine-dup-' || id
WHERE barcode IS NOT NULL AND barcode != ''
AND id NOT IN (
    SELECT MIN(id) FROM dsh_master_products WHERE barcode IS NOT NULL AND barcode != '' GROUP BY barcode
);

UPDATE dsh_master_products
SET gtin = gtin || '-quarantine-dup-' || id
WHERE gtin IS NOT NULL AND gtin != ''
AND id NOT IN (
    SELECT MIN(id) FROM dsh_master_products WHERE gtin IS NOT NULL AND gtin != '' GROUP BY gtin
);

UPDATE dsh_master_products
SET sku = sku || '-quarantine-dup-' || id
WHERE sku IS NOT NULL AND sku != ''
AND id NOT IN (
    SELECT MIN(id) FROM dsh_master_products WHERE sku IS NOT NULL AND sku != '' GROUP BY domain_id, sku
);

-- 4. Re-assert Unique Constraints in case DSH-041 failed to create them due to duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_master_products_barcode ON dsh_master_products (barcode) WHERE barcode IS NOT NULL AND barcode != '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_master_products_gtin ON dsh_master_products (gtin) WHERE gtin IS NOT NULL AND gtin != '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_master_products_sku ON dsh_master_products (domain_id, sku) WHERE sku IS NOT NULL AND sku != '';
