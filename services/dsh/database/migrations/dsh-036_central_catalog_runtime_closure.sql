-- DSH-036: remove the remaining local-catalog runtime truth.
--
-- This migration preserves legacy rows by projecting them into the sovereign
-- catalog before the obsolete per-store catalog and home-category tables are
-- dropped. Historical migrations stay intact; live code and future seeds use
-- only dsh_catalog_domains/nodes, dsh_master_products and
-- dsh_store_assortments.

INSERT INTO dsh_catalog_domains
  (id, slug, name_ar, name_en, icon, sort_order, is_active, is_client_visible,
   requires_product_catalog, is_manual_request)
VALUES
  ('domain-pharmacy', 'pharmacy', 'صيدلية', 'Pharmacy', 'medical-outline', 35,
   TRUE, TRUE, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  is_client_visible = TRUE,
  requires_product_catalog = TRUE,
  is_manual_request = FALSE,
  updated_at = NOW();

ALTER TABLE dsh_stores
  ADD COLUMN IF NOT EXISTS catalog_domain_id TEXT REFERENCES dsh_catalog_domains(id);

UPDATE dsh_stores
SET catalog_domain_id = CASE category
  WHEN 'restaurant' THEN 'domain-restaurants'
  WHEN 'grocery' THEN 'domain-groceries'
  WHEN 'pharmacy' THEN 'domain-pharmacy'
  WHEN 'bakery' THEN 'domain-groceries'
  ELSE 'domain-bthwani-store'
END
WHERE catalog_domain_id IS NULL;

ALTER TABLE dsh_stores
  ALTER COLUMN catalog_domain_id SET DEFAULT 'domain-bthwani-store';

ALTER TABLE dsh_stores
  ALTER COLUMN catalog_domain_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_catalog_domain
  ON dsh_stores(catalog_domain_id);

-- Preserve every legacy product identity. Keeping the same id also repairs
-- historical cart rows backfilled by dsh-033 from product_id.
INSERT INTO dsh_master_products
  (id, domain_id, category_node_id, canonical_name_ar, canonical_name_en,
   brand, sku, unit, measurement_type, approval_status, is_active,
   created_source, created_at, updated_at)
SELECT
  p.id,
  COALESCE(s.catalog_domain_id, 'domain-bthwani-store'),
  CASE
    WHEN LOWER(COALESCE(c.name, '')) LIKE '%مخبوز%' OR s.category = 'bakery'
      THEN 'node-bakeries'
    WHEN LOWER(COALESCE(c.name, '')) LIKE '%بقال%' OR s.category = 'grocery'
      THEN 'node-supermarket'
    ELSE NULL
  END,
  p.name,
  '',
  '',
  NULLIF(p.sku, ''),
  'unit',
  'unit',
  CASE WHEN p.is_active THEN 'approved' ELSE 'archived' END,
  p.is_active,
  'legacy-catalog-migration',
  p.created_at,
  p.updated_at
FROM dsh_catalog_products p
JOIN dsh_stores s ON s.id = p.store_id
LEFT JOIN dsh_catalog_categories c ON c.id = p.category_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_store_assortments
  (id, store_id, master_product_id, unit_price, currency, available,
   stock_status, local_note, publication_status, submitted_by, approved_by,
   created_at, updated_at)
SELECT
  'assortment-' || p.store_id || '-' || p.id,
  p.store_id,
  p.id,
  CASE
    WHEN p.unit_price > 0 THEN p.unit_price
    WHEN BTRIM(p.price_reference) ~ '^[0-9]+([.][0-9]+)?$'
      THEN BTRIM(p.price_reference)::NUMERIC(12,2)
    ELSE 0
  END,
  'YER',
  p.is_active AND (
    p.unit_price > 0 OR BTRIM(p.price_reference) ~ '^[0-9]+([.][0-9]+)?$'
  ),
  CASE WHEN p.is_active THEN 'in_stock' ELSE 'out_of_stock' END,
  p.description,
  CASE
    WHEN p.is_active
      AND s.status = 'active'
      AND s.is_visible = TRUE
      AND s.serviceability_status IN ('serviceable', 'limited')
      AND (p.unit_price > 0 OR BTRIM(p.price_reference) ~ '^[0-9]+([.][0-9]+)?$')
      THEN 'client_visible'
    ELSE 'draft'
  END,
  'system-migration',
  'system-migration',
  p.created_at,
  p.updated_at
FROM dsh_catalog_products p
JOIN dsh_stores s ON s.id = p.store_id
ON CONFLICT (store_id, master_product_id) DO NOTHING;

-- Preserve every non-deleted legacy media row in DAM. Pending uploads remain
-- non-published; the first completed image becomes canonical only when the
-- master product does not already have a governed primary image.
WITH legacy_media AS (
  SELECT id, product_id, object_key, content_type, public_url, state,
    created_at, updated_at
  FROM dsh_catalog_media
  WHERE state <> 'deleted'
)
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, original_file_name, mime_type, status,
   source_surface, uploaded_by, reviewed_by, review_note, created_at, updated_at)
SELECT
  'asset-' || id,
  object_key,
  public_url,
  object_key,
  content_type,
  CASE WHEN state = 'complete' THEN 'approved' ELSE 'uploaded' END,
  'system',
  'system-migration',
  CASE WHEN state = 'complete' THEN 'system-migration' ELSE NULL END,
  'Migrated from the retired local catalog.',
  created_at,
  updated_at
FROM legacy_media
ON CONFLICT (id) DO NOTHING;

WITH ranked_media AS (
  SELECT id, product_id, state, created_at, updated_at,
    SUM(CASE WHEN state = 'complete' THEN 1 ELSE 0 END) OVER (
      PARTITION BY product_id ORDER BY created_at, id
    ) AS complete_rank
  FROM dsh_catalog_media
  WHERE state <> 'deleted'
), linkable_media AS (
  SELECT ranked_media.*,
    state = 'complete'
      AND complete_rank = 1
      AND NOT EXISTS (
        SELECT 1
        FROM dsh_catalog_asset_links existing
        WHERE existing.entity_type = 'master_product'
          AND existing.entity_id = ranked_media.product_id
          AND existing.role = 'canonical_product_image'
          AND existing.is_primary = TRUE
      ) AS becomes_primary
  FROM ranked_media
)
INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, sort_order, is_primary,
   status, created_at, updated_at)
SELECT
  'asset-link-' || id,
  'asset-' || id,
  'master_product',
  product_id,
  CASE WHEN becomes_primary THEN 'canonical_product_image' ELSE 'gallery' END,
  CASE WHEN becomes_primary THEN 0 ELSE (complete_rank + 1)::INTEGER END,
  becomes_primary,
  CASE WHEN state = 'complete' THEN 'approved' ELSE 'draft' END,
  created_at,
  updated_at
FROM linkable_media
ON CONFLICT (entity_type, entity_id, role, asset_id) DO NOTHING;

UPDATE dsh_cart_items ci
SET store_assortment_id = a.id,
    master_product_id = ci.product_id
FROM dsh_carts c
JOIN dsh_store_assortments a ON a.store_id = c.store_id
WHERE ci.cart_id = c.id
  AND a.master_product_id = ci.product_id
  AND ci.store_assortment_id IS NULL;

-- Convert marketing category targets from per-store category ids to the
-- store's sovereign business domain before removing the old category table.
UPDATE dsh_marketing_campaigns m
SET target_id = s.catalog_domain_id
FROM dsh_catalog_categories c
JOIN dsh_stores s ON s.id = c.store_id
WHERE m.target_type IN ('category', 'subcategory') AND m.target_id = c.id;

UPDATE dsh_home_banners
SET action_target = CASE action_target
  WHEN 'all' THEN 'domain-restaurants'
  WHEN 'cat-restaurant' THEN 'domain-restaurants'
  WHEN 'cat-grocery' THEN 'domain-groceries'
  WHEN 'cat-pharmacy' THEN 'domain-pharmacy'
  WHEN 'cat-bakery' THEN 'domain-groceries'
  WHEN 'cat-default' THEN 'domain-bthwani-store'
  ELSE action_target
END
WHERE action_type = 'category';

UPDATE dsh_home_promos
SET action_target = CASE action_target
  WHEN 'cat-restaurant' THEN 'domain-restaurants'
  WHEN 'cat-grocery' THEN 'domain-groceries'
  WHEN 'cat-pharmacy' THEN 'domain-pharmacy'
  WHEN 'cat-bakery' THEN 'domain-groceries'
  WHEN 'cat-default' THEN 'domain-bthwani-store'
  ELSE action_target
END
WHERE action_type = 'category';

ALTER TABLE dsh_stores DROP COLUMN IF EXISTS category_id;
ALTER TABLE dsh_stores DROP COLUMN IF EXISTS category;

DROP TABLE IF EXISTS dsh_catalog_audit;
DROP TABLE IF EXISTS dsh_catalog_revisions;
DROP TABLE IF EXISTS dsh_catalog_media;
DROP TABLE IF EXISTS dsh_catalog_products;
DROP TABLE IF EXISTS dsh_catalog_categories;
DROP TABLE IF EXISTS dsh_categories;
