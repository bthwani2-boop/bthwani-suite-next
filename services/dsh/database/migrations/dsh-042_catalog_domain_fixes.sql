-- DSH-042: Catalog domain fixes, backfill and deduplication

-- 1. Deduplicate barcode, GTIN, SKU (quarantine duplicates to satisfy unique constraints)
UPDATE dsh_master_products
SET barcode = barcode || '-dup-' || id
WHERE barcode IN (
  SELECT barcode FROM dsh_master_products
  WHERE barcode IS NOT NULL AND barcode != ''
  GROUP BY barcode HAVING COUNT(*) > 1
);

UPDATE dsh_master_products
SET gtin = gtin || '-dup-' || id
WHERE gtin IN (
  SELECT gtin FROM dsh_master_products
  WHERE gtin IS NOT NULL AND gtin != ''
  GROUP BY gtin HAVING COUNT(*) > 1
);

UPDATE dsh_master_products
SET sku = sku || '-dup-' || id
WHERE (domain_id, sku) IN (
  SELECT domain_id, sku FROM dsh_master_products
  WHERE sku IS NOT NULL AND sku != ''
  GROUP BY domain_id, sku HAVING COUNT(*) > 1
);

-- 2. Alter dsh_store_catalog_domains default status to 'pending'
ALTER TABLE dsh_store_catalog_domains ALTER COLUMN status SET DEFAULT 'pending';

-- 3. Backfill dsh_store_catalog_domains from dsh_stores (Safe Backfill)
INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status, approved_by, approved_at)
SELECT id, catalog_domain_id, 'approved', 'system-migration', NOW()
FROM dsh_stores
WHERE catalog_domain_id IS NOT NULL
ON CONFLICT (store_id, domain_id) DO NOTHING;

-- 4. Clean up invalid domain references from test data (store-1005 should only have 'domain-restaurants')
DELETE FROM dsh_store_catalog_domains 
WHERE store_id = 'store-1005' 
AND domain_id != 'domain-restaurants';
