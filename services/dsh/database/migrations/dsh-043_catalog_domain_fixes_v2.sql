-- DSH-043: Catalog domain fixes and backfills v2
-- This migration addresses P0 constraints on domain linkages and defaults.

-- 1. Alter default status for store catalog domains to pending
ALTER TABLE dsh_store_catalog_domains ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Clean up store-1005 (Fixing illogical multi-domain assignment)
-- Assume we want to keep it strictly in 'domain-electronics' and remove others.
DELETE FROM dsh_store_catalog_domains 
WHERE store_id = 'store-1005' AND domain_id != 'domain-electronics';

-- 3. Backfill missing domain linkages for existing stores
-- For any store in dsh_stores that has no entries in dsh_store_catalog_domains,
-- we infer their domain based on existing assortments, or default to domain-groceries.

INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status)
SELECT s.id, COALESCE(
  (
    SELECT mp.domain_id 
    FROM dsh_store_assortments sa 
    JOIN dsh_master_products mp ON sa.master_product_id = mp.id 
    WHERE sa.store_id = s.id 
    LIMIT 1
  ),
  'domain-groceries'
), 'approved'
FROM dsh_stores s
WHERE NOT EXISTS (
  SELECT 1 FROM dsh_store_catalog_domains scd WHERE scd.store_id = s.id
)
ON CONFLICT DO NOTHING;

-- 4. Deduplicate products to ensure unique constraints on barcode/gtin don't break subsequent ops
-- If duplicates exist with the same barcode/gtin, we keep the oldest one and nullify the others.
UPDATE dsh_master_products 
SET barcode = NULL 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY barcode ORDER BY created_at ASC) as rn
    FROM dsh_master_products 
    WHERE barcode IS NOT NULL AND barcode != ''
  ) as duplicates
  WHERE rn > 1
);

UPDATE dsh_master_products 
SET gtin = NULL 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY gtin ORDER BY created_at ASC) as rn
    FROM dsh_master_products 
    WHERE gtin IS NOT NULL AND gtin != ''
  ) as duplicates
  WHERE rn > 1
);

UPDATE dsh_master_products 
SET sku = NULL 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY domain_id, sku ORDER BY created_at ASC) as rn
    FROM dsh_master_products 
    WHERE sku IS NOT NULL AND sku != ''
  ) as duplicates
  WHERE rn > 1
);
