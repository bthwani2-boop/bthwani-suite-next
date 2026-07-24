-- Local-only store-card media binding.
--
-- Store media truth remains in the governed DAM. The legacy hero_image_url and
-- logo_url columns are updated only as read-through caches for the public store
-- discovery contract. Every URL is served through the DSH public media route;
-- mobile clients never address MinIO directly.

INSERT INTO dsh_catalog_assets (
    id, object_key, public_url, original_file_name, mime_type, size_bytes,
    width, height, checksum_sha256, alt_ar, alt_en, dominant_color,
    status, source_surface, uploaded_by
) VALUES
    ('asset-local-store-test-grocery-logo', 'realistic/store-test-grocery-logo.jpg', NULL, 'realistic/store-test-grocery-logo.jpg', 'image/jpeg', 0, 600, 600, 'de1e10504ee2d1bc459351692d4f622fbf6b52e14d197171f49ac621520f56fb', 'شعار أسواق حدة المركزية', 'Haddah Central Market logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-test-grocery-cover', 'realistic/store-test-grocery-hero.jpg', NULL, 'realistic/store-test-grocery-hero.jpg', 'image/jpeg', 0, 1200, 600, '04cd18a893fd3e314db85de9818c86eafe2756190ab2412e8e7b260cf3c4d0b8', 'واجهة أسواق حدة المركزية', 'Haddah Central Market cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1002-logo', 'realistic/store-test-sweets-logo.jpg', NULL, 'realistic/store-test-sweets-logo.jpg', 'image/jpeg', 0, 600, 600, '3feafc120084ff8b5a2e54f37b2165b770d0a4cb219bb3e8dd49d738544af12f', 'شعار مخبز السبعين', 'Al Sabeen Bakery logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1002-cover', 'realistic/store-test-sweets-hero.jpg', NULL, 'realistic/store-test-sweets-hero.jpg', 'image/jpeg', 0, 1200, 600, 'b110a798839ac7300abc0be6d1218f026f2a2fb482a50306fba73feb9b52d9e2', 'واجهة مخبز السبعين', 'Al Sabeen Bakery cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1003-logo', 'realistic/store-test-grocery-logo.jpg', NULL, 'realistic/store-test-grocery-logo.jpg', 'image/jpeg', 0, 600, 600, 'de1e10504ee2d1bc459351692d4f622fbf6b52e14d197171f49ac621520f56fb', 'شعار فرع شارع تعز', 'Taiz Street branch logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1003-cover', 'realistic/store-test-grocery-hero.jpg', NULL, 'realistic/store-test-grocery-hero.jpg', 'image/jpeg', 0, 1200, 600, '04cd18a893fd3e314db85de9818c86eafe2756190ab2412e8e7b260cf3c4d0b8', 'واجهة فرع شارع تعز', 'Taiz Street branch cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1004-logo', 'realistic/store-test-grocery-logo.jpg', NULL, 'realistic/store-test-grocery-logo.jpg', 'image/jpeg', 0, 600, 600, 'de1e10504ee2d1bc459351692d4f622fbf6b52e14d197171f49ac621520f56fb', 'شعار فرع الزبيري', 'Al Zubairi branch logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1004-cover', 'realistic/store-test-grocery-hero.jpg', NULL, 'realistic/store-test-grocery-hero.jpg', 'image/jpeg', 0, 1200, 600, '04cd18a893fd3e314db85de9818c86eafe2756190ab2412e8e7b260cf3c4d0b8', 'واجهة فرع الزبيري', 'Al Zubairi branch cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1005-logo', 'realistic/store-test-restaurant-logo.jpg', NULL, 'realistic/store-test-restaurant-logo.jpg', 'image/jpeg', 0, 600, 600, '05d75234f1b7b646e959aa1480aad9bedd28bbed8e845d6307bb79d3c447f23f', 'شعار مطعم المدينة القديمة', 'Old City Restaurant logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1005-cover', 'realistic/store-test-restaurant-hero.jpg', NULL, 'realistic/store-test-restaurant-hero.jpg', 'image/jpeg', 0, 1200, 600, '94d218b4b3d7a7891d27e04b78dcfe6da91ac38f766d16c6cabc133020b07871', 'واجهة مطعم المدينة القديمة', 'Old City Restaurant cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1006-logo', 'realistic/store-test-pharmacy-logo.jpg', NULL, 'realistic/store-test-pharmacy-logo.jpg', 'image/jpeg', 0, 600, 600, 'fe062474e4ff0e24e6edf1ec3cfd309a2be23dbf3b58a5d40d1a1ca98f3b5135', 'شعار صيدلية معين', 'Maeen Pharmacy logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1006-cover', 'realistic/store-test-pharmacy-hero.jpg', NULL, 'realistic/store-test-pharmacy-hero.jpg', 'image/jpeg', 0, 1200, 600, '7dddabe1344a88bf5bd45bc7d38dead0600f7a0346e8d1c914dbfa069c962ebb', 'واجهة صيدلية معين', 'Maeen Pharmacy cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-test-electronics-logo', 'realistic/store-test-electronics-logo.jpg', NULL, 'realistic/store-test-electronics-logo.jpg', 'image/jpeg', 0, 600, 600, '8daa06212a081b222ec8257353f3fac45d138eba847ba66bfe69695b832f137e', 'شعار إلكترونيات المستقبل', 'Future Electronics logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-test-electronics-cover', 'realistic/store-test-electronics-hero.jpg', NULL, 'realistic/store-test-electronics-hero.jpg', 'image/jpeg', 0, 1200, 600, 'c42339dfafc9d400e27f89a4defb166bcaf764207ac1a53f026b1733de22ad9c', 'واجهة إلكترونيات المستقبل', 'Future Electronics cover', '#ffffff', 'approved', 'system', 'system-seed')
ON CONFLICT (id) DO UPDATE SET
    object_key = EXCLUDED.object_key,
    public_url = NULL,
    original_file_name = EXCLUDED.original_file_name,
    mime_type = EXCLUDED.mime_type,
    size_bytes = EXCLUDED.size_bytes,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    checksum_sha256 = EXCLUDED.checksum_sha256,
    alt_ar = EXCLUDED.alt_ar,
    alt_en = EXCLUDED.alt_en,
    dominant_color = EXCLUDED.dominant_color,
    status = 'approved',
    source_surface = EXCLUDED.source_surface,
    uploaded_by = EXCLUDED.uploaded_by,
    updated_at = NOW();

-- Retire any older primary cache/backfill link before promoting the canonical
-- local fixture link. This preserves the one-active-primary DAM invariant.
UPDATE dsh_catalog_asset_links
SET is_primary = FALSE
WHERE entity_type = 'store'
  AND entity_id IN (
      'store-test-grocery', 'store-1002', 'store-1003', 'store-1004',
      'store-1005', 'store-1006', 'store-test-electronics'
  )
  AND role IN ('store_logo', 'store_cover')
  AND status <> 'archived'
  AND id NOT LIKE 'link-local-store-card-%'
  AND is_primary = TRUE;

INSERT INTO dsh_catalog_asset_links (
    id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status
) VALUES
    ('link-local-store-card-store-test-grocery-logo', 'asset-local-store-test-grocery-logo', 'store', 'store-test-grocery', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-test-grocery-cover', 'asset-local-store-test-grocery-cover', 'store', 'store-test-grocery', 'store_cover', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1002-logo', 'asset-local-store-1002-logo', 'store', 'store-1002', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1002-cover', 'asset-local-store-1002-cover', 'store', 'store-1002', 'store_cover', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1003-logo', 'asset-local-store-1003-logo', 'store', 'store-1003', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1003-cover', 'asset-local-store-1003-cover', 'store', 'store-1003', 'store_cover', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1004-logo', 'asset-local-store-1004-logo', 'store', 'store-1004', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1004-cover', 'asset-local-store-1004-cover', 'store', 'store-1004', 'store_cover', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1005-logo', 'asset-local-store-1005-logo', 'store', 'store-1005', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1005-cover', 'asset-local-store-1005-cover', 'store', 'store-1005', 'store_cover', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1006-logo', 'asset-local-store-1006-logo', 'store', 'store-1006', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-1006-cover', 'asset-local-store-1006-cover', 'store', 'store-1006', 'store_cover', 0, TRUE, 'approved'),
    ('link-local-store-card-store-test-electronics-logo', 'asset-local-store-test-electronics-logo', 'store', 'store-test-electronics', 'store_logo', 0, TRUE, 'approved'),
    ('link-local-store-card-store-test-electronics-cover', 'asset-local-store-test-electronics-cover', 'store', 'store-test-electronics', 'store_cover', 0, TRUE, 'approved')
ON CONFLICT (id) DO UPDATE SET
    asset_id = EXCLUDED.asset_id,
    entity_type = EXCLUDED.entity_type,
    entity_id = EXCLUDED.entity_id,
    role = EXCLUDED.role,
    sort_order = EXCLUDED.sort_order,
    is_primary = TRUE,
    status = 'approved',
    updated_at = NOW();

WITH store_media(store_id, cover_asset_id, logo_asset_id) AS (
    VALUES
        ('store-test-grocery', 'asset-local-store-test-grocery-cover', 'asset-local-store-test-grocery-logo'),
        ('store-1002', 'asset-local-store-1002-cover', 'asset-local-store-1002-logo'),
        ('store-1003', 'asset-local-store-1003-cover', 'asset-local-store-1003-logo'),
        ('store-1004', 'asset-local-store-1004-cover', 'asset-local-store-1004-logo'),
        ('store-1005', 'asset-local-store-1005-cover', 'asset-local-store-1005-logo'),
        ('store-1006', 'asset-local-store-1006-cover', 'asset-local-store-1006-logo'),
        ('store-test-electronics', 'asset-local-store-test-electronics-cover', 'asset-local-store-test-electronics-logo')
)
UPDATE dsh_stores store
SET hero_image_url = '/dsh/public/media/' || store_media.cover_asset_id || '/original',
    logo_url = '/dsh/public/media/' || store_media.logo_asset_id || '/original',
    updated_at = NOW()
FROM store_media
WHERE store.id = store_media.store_id
  AND store.tenant_id = 'local-dsh';
