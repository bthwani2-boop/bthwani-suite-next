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
    ('asset-local-store-test-grocery-logo', 'logos/store-test-grocery-logo.png', NULL, 'store-test-grocery-logo.png', 'image/png', 1381, 600, 600, '2bcbc7706da57ac015d393007eea6ec357d7317cc467fa27f26961813a88135d', 'شعار أسواق حدة المركزية', 'Haddah Central Market logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-test-grocery-cover', 'storefronts/store-test-grocery-hero.png', NULL, 'store-test-grocery-hero.png', 'image/png', 1385, 1200, 600, '2977129d3d0d0f49c4322ccf5ebb2903b583bb94d4d5270d5a6e572b8b93418a', 'واجهة أسواق حدة المركزية', 'Haddah Central Market cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1002-logo', 'logos/store-1002-logo.png', NULL, 'store-1002-logo.png', 'image/png', 1361, 600, 600, '9a46e9b9eea8f031ddbf7098810675068e2611a247b1062b111b553b1e8391b4', 'شعار مخبز السبعين', 'Al Sabeen Bakery logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1002-cover', 'storefronts/store-1002-hero.png', NULL, 'store-1002-hero.png', 'image/png', 1361, 1200, 600, 'cab344c57dac2424ddf8fc030fb2dddb57d6a581dfa382921961f092fad7f24a', 'واجهة مخبز السبعين', 'Al Sabeen Bakery cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1003-logo', 'logos/store-1003-logo.png', NULL, 'store-1003-logo.png', 'image/png', 1385, 600, 600, '3b7d3dfbf86b0ded9280a4315d906c4afbebf910d7fddee1f27b04712c7277ab', 'شعار فرع شارع تعز', 'Taiz Street branch logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1003-cover', 'storefronts/store-1003-hero.png', NULL, 'store-1003-hero.png', 'image/png', 1385, 1200, 600, '792746d4fc6f4c118025c932740e0d94df6ffcca9aa6a80529d4b33279b3e357', 'واجهة فرع شارع تعز', 'Taiz Street branch cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1004-logo', 'logos/store-1004-logo.png', NULL, 'store-1004-logo.png', 'image/png', 372, 600, 600, '5e85777568a370d1f35d18b375a999284288b53e0be42aea576e5b95244b9b49', 'شعار فرع الزبيري', 'Al Zubairi branch logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1004-cover', 'storefronts/store-1004-hero.png', NULL, 'store-1004-hero.png', 'image/png', 844, 1200, 600, 'd1b5d40c767d0fce7673d56ce591b3f00e79d5bbd0f67210048ec238403415ec', 'واجهة فرع الزبيري', 'Al Zubairi branch cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1005-logo', 'logos/store-1005-logo.png', NULL, 'store-1005-logo.png', 'image/png', 1359, 600, 600, '00e0d6d64c6597b362eb944eb3efd28e730c3683377bf68feaa522cadc88a936', 'شعار مطعم المدينة القديمة', 'Old City Restaurant logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1005-cover', 'storefronts/store-1005-hero.png', NULL, 'store-1005-hero.png', 'image/png', 9, 1200, 600, '7b8e26dcad0f875ab664ba21627c49d71cba8b329cc48fabdf70ef5e799a7457', 'واجهة مطعم المدينة القديمة', 'Old City Restaurant cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-1006-logo', 'logos/store-1006-logo.png', NULL, 'store-1006-logo.png', 'image/png', 1334, 600, 600, 'f3b70183e437388e3c9054e09649024a3202ce7d26f0be806373a6f23fa3ddbc', 'شعار صيدلية معين', 'Maeen Pharmacy logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-1006-cover', 'storefronts/store-1006-hero.png', NULL, 'store-1006-hero.png', 'image/png', 1315, 1200, 600, 'd0eb6e54f091df8dab5654c75292fd7f12191ccb1dbab01b30591cd561074cee', 'واجهة صيدلية معين', 'Maeen Pharmacy cover', '#ffffff', 'approved', 'system', 'system-seed'),

    ('asset-local-store-test-electronics-logo', 'logos/store-test-electronics-logo.png', NULL, 'store-test-electronics-logo.png', 'image/png', 406, 600, 600, 'b0ed87a2585d3106c179ecc862e54579f552fd3bca10df006eb93d56d3f29214', 'شعار إلكترونيات المستقبل', 'Future Electronics logo', '#ffffff', 'approved', 'system', 'system-seed'),
    ('asset-local-store-test-electronics-cover', 'storefronts/store-test-electronics-hero.png', NULL, 'store-test-electronics-hero.png', 'image/png', 637, 1200, 600, '601ff490aa42e3ae767f4b141437d885d32ee6fc45b9ce89b7a46ee3613fbbb7', 'واجهة إلكترونيات المستقبل', 'Future Electronics cover', '#ffffff', 'approved', 'system', 'system-seed')
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
  AND store.operator_context_id = 'local-dsh';
