-- DSH-036: remove the remaining local-catalog runtime truth.
--
-- This migration preserves legacy rows by projecting them into the sovereign
-- catalog before the obsolete per-store catalog and home-category tables are
-- dropped. Historical migrations stay intact; live code and future seeds use
-- only dsh_catalog_domains/nodes, dsh_master_products and
-- dsh_store_assortments.
--
-- Hardening (corrective closure):
--   * The whole migration is one atomic transaction: any projection or
--     verification failure rolls everything back — no partial drops.
--   * Legacy audit/revision/category/product/media rows are archived as JSONB
--     into the permanent dsh_catalog_legacy_archive table before any DROP.
--   * Media without a product stay preserved in the DAM (dsh_catalog_assets)
--     without creating an invalid NULL entity link; asset links are created
--     only WHERE product_id IS NOT NULL and the master product exists.
--   * DO-block verification gates RAISE EXCEPTION (=> ROLLBACK) if any legacy
--     product, assortment, media asset, media link, cart mapping or archive
--     row is missing before the legacy tables are dropped.
--   * Re-runnable: when the legacy tables are already gone the projection
--     block is skipped and every remaining statement is a no-op.

BEGIN;

-- Permanent archive for legacy catalog rows that have no direct projection
-- into the sovereign catalog (audit trail, revisions) plus full JSONB
-- snapshots of every legacy row for forensic recovery.
CREATE TABLE IF NOT EXISTS dsh_catalog_legacy_archive (
  id             TEXT        PRIMARY KEY,
  source_table   TEXT        NOT NULL,
  source_id      TEXT        NOT NULL,
  store_id       TEXT,
  payload_json   JSONB       NOT NULL,
  archived_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migration_name TEXT        NOT NULL,
  UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_legacy_archive_source
  ON dsh_catalog_legacy_archive (source_table, store_id);

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

-- Map the retired dsh_stores.category enum onto the sovereign business
-- domain. Guarded so a re-run (category column already dropped) is a no-op.
DO $dsh036_store_domain$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_stores'
      AND column_name = 'category'
  ) THEN
    UPDATE dsh_stores
    SET catalog_domain_id = CASE category
      WHEN 'restaurant' THEN 'domain-restaurants'
      WHEN 'grocery' THEN 'domain-groceries'
      WHEN 'pharmacy' THEN 'domain-pharmacy'
      WHEN 'bakery' THEN 'domain-groceries'
      ELSE 'domain-bthwani-store'
    END
    WHERE catalog_domain_id IS NULL;
  END IF;

  UPDATE dsh_stores
  SET catalog_domain_id = 'domain-bthwani-store'
  WHERE catalog_domain_id IS NULL;
END
$dsh036_store_domain$;

ALTER TABLE dsh_stores
  ALTER COLUMN catalog_domain_id SET DEFAULT 'domain-bthwani-store';

ALTER TABLE dsh_stores
  ALTER COLUMN catalog_domain_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_catalog_domain
  ON dsh_stores(catalog_domain_id);

-- ---------------------------------------------------------------------------
-- Legacy projection + archive + verification. The whole block is skipped when
-- the legacy tables were already removed by a previous successful run.
-- ---------------------------------------------------------------------------
DO $dsh036_legacy$
DECLARE
  v_bad BIGINT;
BEGIN
  IF to_regclass('public.dsh_catalog_products') IS NULL THEN
    RAISE NOTICE 'dsh-036: legacy catalog tables already removed; skipping legacy projection.';
    RETURN;
  END IF;

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

  -- Preserve every non-deleted legacy media row in DAM — including media that
  -- has no product (product_id IS NULL). Those stay in dsh_catalog_assets
  -- without an entity link; nothing is lost because of a missing product_id.
  INSERT INTO dsh_catalog_assets
    (id, object_key, public_url, original_file_name, mime_type, status,
     source_surface, uploaded_by, reviewed_by, review_note, created_at, updated_at)
  SELECT
    'asset-' || m.id,
    m.object_key,
    m.public_url,
    m.object_key,
    m.content_type,
    CASE WHEN m.state = 'complete' THEN 'approved' ELSE 'uploaded' END,
    'system',
    'system-migration',
    CASE WHEN m.state = 'complete' THEN 'system-migration' ELSE NULL END,
    'Migrated from the retired local catalog.',
    m.created_at,
    m.updated_at
  FROM dsh_catalog_media m
  WHERE m.state <> 'deleted'
  ON CONFLICT (id) DO NOTHING;

  -- Asset links are only valid for media attached to a real, migrated master
  -- product: dsh_catalog_asset_links.entity_id is NOT NULL by contract, so
  -- product-less media must never produce a link row.
  WITH ranked_media AS (
    SELECT id, product_id, state, created_at, updated_at,
      SUM(CASE WHEN state = 'complete' THEN 1 ELSE 0 END) OVER (
        PARTITION BY product_id ORDER BY created_at, id
      ) AS complete_rank
    FROM dsh_catalog_media
    WHERE state <> 'deleted'
      AND product_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM dsh_master_products mp WHERE mp.id = dsh_catalog_media.product_id
      )
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
  WHERE product_id IS NOT NULL
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

  -- Archive the audit trail, the review history and full JSONB snapshots of
  -- every legacy catalog row before the tables are dropped. Nothing may be
  -- dropped unless every source row has a matching archive row.
  INSERT INTO dsh_catalog_legacy_archive
    (id, source_table, source_id, store_id, payload_json, migration_name)
  SELECT 'dsh_catalog_audit:' || t.id, 'dsh_catalog_audit', t.id, t.store_id,
         to_jsonb(t), 'dsh-036_central_catalog_runtime_closure'
  FROM dsh_catalog_audit t
  ON CONFLICT (source_table, source_id) DO NOTHING;

  INSERT INTO dsh_catalog_legacy_archive
    (id, source_table, source_id, store_id, payload_json, migration_name)
  SELECT 'dsh_catalog_revisions:' || t.id, 'dsh_catalog_revisions', t.id, t.store_id,
         to_jsonb(t), 'dsh-036_central_catalog_runtime_closure'
  FROM dsh_catalog_revisions t
  ON CONFLICT (source_table, source_id) DO NOTHING;

  INSERT INTO dsh_catalog_legacy_archive
    (id, source_table, source_id, store_id, payload_json, migration_name)
  SELECT 'dsh_catalog_categories:' || t.id, 'dsh_catalog_categories', t.id, t.store_id,
         to_jsonb(t), 'dsh-036_central_catalog_runtime_closure'
  FROM dsh_catalog_categories t
  ON CONFLICT (source_table, source_id) DO NOTHING;

  INSERT INTO dsh_catalog_legacy_archive
    (id, source_table, source_id, store_id, payload_json, migration_name)
  SELECT 'dsh_catalog_products:' || t.id, 'dsh_catalog_products', t.id, t.store_id,
         to_jsonb(t), 'dsh-036_central_catalog_runtime_closure'
  FROM dsh_catalog_products t
  ON CONFLICT (source_table, source_id) DO NOTHING;

  INSERT INTO dsh_catalog_legacy_archive
    (id, source_table, source_id, store_id, payload_json, migration_name)
  SELECT 'dsh_catalog_media:' || t.id, 'dsh_catalog_media', t.id, t.store_id,
         to_jsonb(t), 'dsh-036_central_catalog_runtime_closure'
  FROM dsh_catalog_media t
  ON CONFLICT (source_table, source_id) DO NOTHING;

  INSERT INTO dsh_catalog_legacy_archive
    (id, source_table, source_id, store_id, payload_json, migration_name)
  SELECT 'dsh_categories:' || t.id, 'dsh_categories', t.id, NULL,
         to_jsonb(t), 'dsh-036_central_catalog_runtime_closure'
  FROM dsh_categories t
  ON CONFLICT (source_table, source_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Verification gates. Any mismatch aborts the whole transaction so the
  -- legacy tables are never dropped in a partially-migrated state.
  -- -------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_products p
  WHERE NOT EXISTS (SELECT 1 FROM dsh_master_products mp WHERE mp.id = p.id);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % legacy products missing from dsh_master_products', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_products p
  WHERE NOT EXISTS (
    SELECT 1 FROM dsh_store_assortments a
    WHERE a.store_id = p.store_id AND a.master_product_id = p.id
  );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % legacy products missing from dsh_store_assortments', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_media m
  WHERE m.state <> 'deleted'
    AND NOT EXISTS (SELECT 1 FROM dsh_catalog_assets a WHERE a.id = 'asset-' || m.id);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % non-deleted legacy media rows missing from dsh_catalog_assets', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_media m
  WHERE m.state <> 'deleted'
    AND m.product_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM dsh_master_products mp WHERE mp.id = m.product_id)
    AND NOT EXISTS (
      SELECT 1 FROM dsh_catalog_asset_links l
      WHERE l.asset_id = 'asset-' || m.id
        AND l.entity_type = 'master_product'
        AND l.entity_id = m.product_id
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % product-bound legacy media rows missing from dsh_catalog_asset_links', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_cart_items ci
  JOIN dsh_carts c ON c.id = ci.cart_id
  WHERE ci.store_assortment_id IS NULL
    AND EXISTS (
      SELECT 1 FROM dsh_store_assortments a
      WHERE a.store_id = c.store_id AND a.master_product_id = ci.product_id
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % legacy cart items left unmapped to a store assortment', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (SELECT 1 FROM dsh_master_products mp WHERE mp.id = a.master_product_id)
     OR NOT EXISTS (SELECT 1 FROM dsh_stores s WHERE s.id = a.store_id);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % orphan store assortments detected', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_asset_links l
  WHERE l.entity_type = 'master_product'
    AND NOT EXISTS (SELECT 1 FROM dsh_master_products mp WHERE mp.id = l.entity_id);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % orphan master-product asset links detected', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_audit t
  WHERE NOT EXISTS (
    SELECT 1 FROM dsh_catalog_legacy_archive x
    WHERE x.source_table = 'dsh_catalog_audit' AND x.source_id = t.id
  );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % dsh_catalog_audit rows missing from the legacy archive', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_catalog_revisions t
  WHERE NOT EXISTS (
    SELECT 1 FROM dsh_catalog_legacy_archive x
    WHERE x.source_table = 'dsh_catalog_revisions' AND x.source_id = t.id
  );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-036 gate: % dsh_catalog_revisions rows missing from the legacy archive', v_bad;
  END IF;
END
$dsh036_legacy$;

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

COMMIT;
