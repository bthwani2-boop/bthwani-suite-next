-- DSH-038: Catalog media integrity closure.
--
-- Closes three gaps left after dsh-032 (DAM core) and dsh-037 (store media
-- DAM): (1) an "intent" on dsh_catalog_assets so a client can create an
-- upload intent for a specific target entity/role before the asset is
-- reviewed and linked (complete-and-link is done in application code, not
-- here — no CHECK constraints on the intent columns); (2) a governed video
-- role ('reel_video') for the partner-submitted reels pipeline, plus the
-- dsh_reels table that tracks a reel's review lifecycle and click-through
-- target; (3) tightening the "one active primary per entity/role" invariant
-- so archived links no longer block a new primary from being promoted, and
-- backfilling dsh_catalog_asset_links from the five legacy media columns
-- still carried on dsh_stores so every store photo has a DAM-governed
-- asset+link instead of only a free-text column.
--
-- Store column note: dsh_stores carries all five legacy media columns this
-- migration backfills — logo_url/hero_image_url (dsh-001) and
-- storefront_photo_ref/interior_photo_ref/signage_photo_ref (dsh-016).
-- Nothing is omitted.
--
-- Idempotency: every statement is safe to run twice (IF NOT EXISTS /
-- DROP+recreate / ON CONFLICT DO NOTHING / guarded DML), which CI relies on
-- by applying every migration twice with raw psql. Once applied, this file
-- must never be edited — only a future dsh-039+ may change this further.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Upload-intent columns on dsh_catalog_assets.
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_catalog_assets ADD COLUMN IF NOT EXISTS intended_entity_type TEXT;
ALTER TABLE dsh_catalog_assets ADD COLUMN IF NOT EXISTS intended_entity_id TEXT;
ALTER TABLE dsh_catalog_assets ADD COLUMN IF NOT EXISTS intended_role TEXT;

-- ---------------------------------------------------------------------------
-- 2. Extend dsh_catalog_asset_links.role with 'reel_video' for the governed
--    video pipeline (dsh-037's role list plus reel_video).
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_catalog_asset_links
    DROP CONSTRAINT IF EXISTS dsh_catalog_asset_links_role_check;
ALTER TABLE dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_role_check CHECK (role IN
        ('icon', 'cover', 'thumbnail', 'gallery', 'canonical_product_image',
         'partner_custom_product_image', 'marketing_banner', 'document',
         'store_logo', 'store_cover', 'storefront_photo', 'interior_photo', 'signage_photo',
         'reel_video'));

-- ---------------------------------------------------------------------------
-- 3. dsh_reels: partner-submitted reel video review + click-through target.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_reels (
  id                TEXT        PRIMARY KEY,
  asset_id          TEXT        NOT NULL REFERENCES dsh_catalog_assets(id),
  title_ar          TEXT        NOT NULL DEFAULT '',
  title_en          TEXT        NOT NULL DEFAULT '',
  target_type       TEXT        NOT NULL CHECK (target_type IN ('master_product', 'store', 'offer')),
  target_id         TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending_review' CHECK (status IN
                         ('pending_review', 'approved', 'rejected', 'archived')),
  sort_order        INT         NOT NULL DEFAULT 0,
  submitted_by      TEXT        NOT NULL,
  submitted_by_role TEXT        NOT NULL DEFAULT 'partner',
  source_store_id   TEXT,
  reviewed_by       TEXT,
  review_note       TEXT        NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsh_reels_status
  ON dsh_reels (status, sort_order, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_reels_asset
  ON dsh_reels (asset_id);

-- ---------------------------------------------------------------------------
-- 4. Upgrade the "one active primary per entity/role" index so it only
--    considers non-archived links (dsh-032's uq_dsh_catalog_asset_links_primary
--    counted archived rows too, which blocks promoting a new primary once the
--    old one is archived). Gate first: refuse to upgrade if the current data
--    already has more than one active primary per entity/role group.
-- ---------------------------------------------------------------------------
DO $dsh038_primary_gate$
DECLARE
  v_bad BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_bad FROM (
    SELECT entity_type, entity_id, role
    FROM dsh_catalog_asset_links
    WHERE is_primary = TRUE AND status <> 'archived'
    GROUP BY entity_type, entity_id, role
    HAVING COUNT(*) > 1
  ) dup;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % entity/role groups have more than one active (non-archived) primary asset link', v_bad;
  END IF;
END
$dsh038_primary_gate$;

DROP INDEX IF EXISTS uq_dsh_catalog_asset_links_primary;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_catalog_asset_links_primary_active
  ON dsh_catalog_asset_links (entity_type, entity_id, role)
  WHERE is_primary = TRUE AND status <> 'archived';

-- ---------------------------------------------------------------------------
-- 5. Backfill dsh_catalog_asset_links from the five legacy store media
--    columns. For each pair: create a DAM asset (deterministic id) pointing
--    at the existing URL/ref (object_key stays empty for http(s) URLs, since
--    the object is not in our bucket; public_url carries the URL instead)
--    and an approved primary link, but only when the legacy value is
--    non-empty and is not already a DAM-served path. Links are only inserted
--    when no active primary link already covers that store+role. Both inserts
--    are additionally guarded by ON CONFLICT (id) DO NOTHING for safety under
--    a double apply.
-- ---------------------------------------------------------------------------

-- 5a. logo_url -> store_logo
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, mime_type, size_bytes, status, source_surface, uploaded_by, reviewed_by, review_note)
SELECT
  'asset-bf-store-' || s.id || '-store_logo',
  CASE WHEN s.logo_url LIKE 'http%' THEN '' ELSE s.logo_url END,
  CASE WHEN s.logo_url LIKE 'http%' THEN s.logo_url END,
  'image/png',
  0,
  'approved',
  'system',
  'system-migration',
  'system-migration',
  'Backfilled from dsh_stores.logo_url by dsh-038.'
FROM dsh_stores s
WHERE s.logo_url IS NOT NULL AND s.logo_url <> '' AND s.logo_url NOT LIKE '/dsh/public/media/%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, is_primary, status)
SELECT
  'link-bf-store-' || s.id || '-store_logo',
  'asset-bf-store-' || s.id || '-store_logo',
  'store',
  s.id,
  'store_logo',
  TRUE,
  'approved'
FROM dsh_stores s
WHERE s.logo_url IS NOT NULL AND s.logo_url <> '' AND s.logo_url NOT LIKE '/dsh/public/media/%'
  AND NOT EXISTS (
    SELECT 1 FROM dsh_catalog_asset_links l
    WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'store_logo'
      AND l.is_primary = TRUE AND l.status <> 'archived'
  )
ON CONFLICT (id) DO NOTHING;

-- 5b. hero_image_url -> store_cover
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, mime_type, size_bytes, status, source_surface, uploaded_by, reviewed_by, review_note)
SELECT
  'asset-bf-store-' || s.id || '-store_cover',
  CASE WHEN s.hero_image_url LIKE 'http%' THEN '' ELSE s.hero_image_url END,
  CASE WHEN s.hero_image_url LIKE 'http%' THEN s.hero_image_url END,
  'image/png',
  0,
  'approved',
  'system',
  'system-migration',
  'system-migration',
  'Backfilled from dsh_stores.hero_image_url by dsh-038.'
FROM dsh_stores s
WHERE s.hero_image_url IS NOT NULL AND s.hero_image_url <> '' AND s.hero_image_url NOT LIKE '/dsh/public/media/%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, is_primary, status)
SELECT
  'link-bf-store-' || s.id || '-store_cover',
  'asset-bf-store-' || s.id || '-store_cover',
  'store',
  s.id,
  'store_cover',
  TRUE,
  'approved'
FROM dsh_stores s
WHERE s.hero_image_url IS NOT NULL AND s.hero_image_url <> '' AND s.hero_image_url NOT LIKE '/dsh/public/media/%'
  AND NOT EXISTS (
    SELECT 1 FROM dsh_catalog_asset_links l
    WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'store_cover'
      AND l.is_primary = TRUE AND l.status <> 'archived'
  )
ON CONFLICT (id) DO NOTHING;

-- 5c. storefront_photo_ref -> storefront_photo
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, mime_type, size_bytes, status, source_surface, uploaded_by, reviewed_by, review_note)
SELECT
  'asset-bf-store-' || s.id || '-storefront_photo',
  CASE WHEN s.storefront_photo_ref LIKE 'http%' THEN '' ELSE s.storefront_photo_ref END,
  CASE WHEN s.storefront_photo_ref LIKE 'http%' THEN s.storefront_photo_ref END,
  'image/png',
  0,
  'approved',
  'system',
  'system-migration',
  'system-migration',
  'Backfilled from dsh_stores.storefront_photo_ref by dsh-038.'
FROM dsh_stores s
WHERE s.storefront_photo_ref IS NOT NULL AND s.storefront_photo_ref <> '' AND s.storefront_photo_ref NOT LIKE '/dsh/public/media/%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, is_primary, status)
SELECT
  'link-bf-store-' || s.id || '-storefront_photo',
  'asset-bf-store-' || s.id || '-storefront_photo',
  'store',
  s.id,
  'storefront_photo',
  TRUE,
  'approved'
FROM dsh_stores s
WHERE s.storefront_photo_ref IS NOT NULL AND s.storefront_photo_ref <> '' AND s.storefront_photo_ref NOT LIKE '/dsh/public/media/%'
  AND NOT EXISTS (
    SELECT 1 FROM dsh_catalog_asset_links l
    WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'storefront_photo'
      AND l.is_primary = TRUE AND l.status <> 'archived'
  )
ON CONFLICT (id) DO NOTHING;

-- 5d. interior_photo_ref -> interior_photo
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, mime_type, size_bytes, status, source_surface, uploaded_by, reviewed_by, review_note)
SELECT
  'asset-bf-store-' || s.id || '-interior_photo',
  CASE WHEN s.interior_photo_ref LIKE 'http%' THEN '' ELSE s.interior_photo_ref END,
  CASE WHEN s.interior_photo_ref LIKE 'http%' THEN s.interior_photo_ref END,
  'image/png',
  0,
  'approved',
  'system',
  'system-migration',
  'system-migration',
  'Backfilled from dsh_stores.interior_photo_ref by dsh-038.'
FROM dsh_stores s
WHERE s.interior_photo_ref IS NOT NULL AND s.interior_photo_ref <> '' AND s.interior_photo_ref NOT LIKE '/dsh/public/media/%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, is_primary, status)
SELECT
  'link-bf-store-' || s.id || '-interior_photo',
  'asset-bf-store-' || s.id || '-interior_photo',
  'store',
  s.id,
  'interior_photo',
  TRUE,
  'approved'
FROM dsh_stores s
WHERE s.interior_photo_ref IS NOT NULL AND s.interior_photo_ref <> '' AND s.interior_photo_ref NOT LIKE '/dsh/public/media/%'
  AND NOT EXISTS (
    SELECT 1 FROM dsh_catalog_asset_links l
    WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'interior_photo'
      AND l.is_primary = TRUE AND l.status <> 'archived'
  )
ON CONFLICT (id) DO NOTHING;

-- 5e. signage_photo_ref -> signage_photo
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, mime_type, size_bytes, status, source_surface, uploaded_by, reviewed_by, review_note)
SELECT
  'asset-bf-store-' || s.id || '-signage_photo',
  CASE WHEN s.signage_photo_ref LIKE 'http%' THEN '' ELSE s.signage_photo_ref END,
  CASE WHEN s.signage_photo_ref LIKE 'http%' THEN s.signage_photo_ref END,
  'image/png',
  0,
  'approved',
  'system',
  'system-migration',
  'system-migration',
  'Backfilled from dsh_stores.signage_photo_ref by dsh-038.'
FROM dsh_stores s
WHERE s.signage_photo_ref IS NOT NULL AND s.signage_photo_ref <> '' AND s.signage_photo_ref NOT LIKE '/dsh/public/media/%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, is_primary, status)
SELECT
  'link-bf-store-' || s.id || '-signage_photo',
  'asset-bf-store-' || s.id || '-signage_photo',
  'store',
  s.id,
  'signage_photo',
  TRUE,
  'approved'
FROM dsh_stores s
WHERE s.signage_photo_ref IS NOT NULL AND s.signage_photo_ref <> '' AND s.signage_photo_ref NOT LIKE '/dsh/public/media/%'
  AND NOT EXISTS (
    SELECT 1 FROM dsh_catalog_asset_links l
    WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'signage_photo'
      AND l.is_primary = TRUE AND l.status <> 'archived'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Final verification gate. Any failure aborts the whole transaction.
-- ---------------------------------------------------------------------------
DO $dsh038_verify$
DECLARE
  v_bad BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_dsh_catalog_asset_links_primary_active'
  ) THEN
    RAISE EXCEPTION 'dsh-038: uq_dsh_catalog_asset_links_primary_active index is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_dsh_catalog_asset_links_primary'
  ) THEN
    RAISE EXCEPTION 'dsh-038: legacy uq_dsh_catalog_asset_links_primary index is still present';
  END IF;

  SELECT COUNT(*) INTO v_bad FROM (
    SELECT entity_type, entity_id, role
    FROM dsh_catalog_asset_links
    WHERE is_primary = TRUE AND status <> 'archived'
    GROUP BY entity_type, entity_id, role
    HAVING COUNT(*) > 1
  ) dup;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % entity/role groups still have duplicate active-primary asset links', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_stores s
  WHERE s.logo_url IS NOT NULL AND s.logo_url <> '' AND s.logo_url NOT LIKE '/dsh/public/media/%'
    AND NOT EXISTS (
      SELECT 1 FROM dsh_catalog_asset_links l
      WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'store_logo' AND l.status = 'approved'
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % stores with a legacy logo_url are missing an approved store_logo link', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_stores s
  WHERE s.hero_image_url IS NOT NULL AND s.hero_image_url <> '' AND s.hero_image_url NOT LIKE '/dsh/public/media/%'
    AND NOT EXISTS (
      SELECT 1 FROM dsh_catalog_asset_links l
      WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'store_cover' AND l.status = 'approved'
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % stores with a legacy hero_image_url are missing an approved store_cover link', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_stores s
  WHERE s.storefront_photo_ref IS NOT NULL AND s.storefront_photo_ref <> '' AND s.storefront_photo_ref NOT LIKE '/dsh/public/media/%'
    AND NOT EXISTS (
      SELECT 1 FROM dsh_catalog_asset_links l
      WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'storefront_photo' AND l.status = 'approved'
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % stores with a legacy storefront_photo_ref are missing an approved storefront_photo link', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_stores s
  WHERE s.interior_photo_ref IS NOT NULL AND s.interior_photo_ref <> '' AND s.interior_photo_ref NOT LIKE '/dsh/public/media/%'
    AND NOT EXISTS (
      SELECT 1 FROM dsh_catalog_asset_links l
      WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'interior_photo' AND l.status = 'approved'
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % stores with a legacy interior_photo_ref are missing an approved interior_photo link', v_bad;
  END IF;

  SELECT COUNT(*) INTO v_bad
  FROM dsh_stores s
  WHERE s.signage_photo_ref IS NOT NULL AND s.signage_photo_ref <> '' AND s.signage_photo_ref NOT LIKE '/dsh/public/media/%'
    AND NOT EXISTS (
      SELECT 1 FROM dsh_catalog_asset_links l
      WHERE l.entity_type = 'store' AND l.entity_id = s.id AND l.role = 'signage_photo' AND l.status = 'approved'
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'dsh-038: % stores with a legacy signage_photo_ref are missing an approved signage_photo link', v_bad;
  END IF;

  IF to_regclass('public.dsh_reels') IS NULL THEN
    RAISE EXCEPTION 'dsh-038: dsh_reels table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dsh_catalog_asset_links_role_check'
      AND pg_get_constraintdef(oid) LIKE '%reel_video%'
  ) THEN
    RAISE EXCEPTION 'dsh-038: dsh_catalog_asset_links_role_check does not accept reel_video';
  END IF;
END
$dsh038_verify$;

COMMIT;
