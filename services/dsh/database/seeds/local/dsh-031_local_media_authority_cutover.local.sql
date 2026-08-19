-- One-time local-media authority cutover.
--
-- Earlier local DSH seeds materialized media metadata directly inside the DSH
-- seed service and dsh-038 could backfill /dsh-media/* store columns into DAM.
-- The canonical replacement is the separate dsh-media runtime overlay generated
-- from services/dsh/database/seeds/media/local-media.manifest.json. Remove only
-- deterministic legacy fixture rows; never touch user/partner-owned DAM data.

DELETE FROM dsh_catalog_asset_links
WHERE asset_id IN (
  SELECT id
  FROM dsh_catalog_assets
  WHERE (
      uploaded_by = 'system-seed'
      AND source_surface = 'system'
      AND (
        id LIKE 'asset-node-%'
        OR id LIKE 'asset-local-store-%'
        OR id LIKE 'asset-public-product-%'
      )
    )
    OR (
      uploaded_by = 'system-migration'
      AND source_surface = 'system'
      AND id LIKE 'asset-bf-store-%'
      AND object_key LIKE '/dsh-media/%'
    )
);

DELETE FROM dsh_catalog_assets
WHERE (
    uploaded_by = 'system-seed'
    AND source_surface = 'system'
    AND (
      id LIKE 'asset-node-%'
      OR id LIKE 'asset-local-store-%'
      OR id LIKE 'asset-public-product-%'
    )
  )
  OR (
    uploaded_by = 'system-migration'
    AND source_surface = 'system'
    AND id LIKE 'asset-bf-store-%'
    AND object_key LIKE '/dsh-media/%'
  );

-- If the short-lived pre-cutover overlay was already run locally, invalidate
-- its generated seed ledger so the canonical overlay is re-applied after this
-- cleanup in the same bootstrap when media is explicitly selected.
DELETE FROM runtime_seed_history
WHERE service_name = 'dsh-media';

-- The deleted static media seed must not survive as stale provenance.
DELETE FROM runtime_seed_history
WHERE service_name = 'dsh'
  AND seed_name = 'dsh-959_store_card_media.local.sql';
