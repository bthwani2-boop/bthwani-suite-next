-- Local-only catalog completion for every store intentionally published to the
-- app-client. Public discovery is fail-closed when no approved assortment can be
-- rendered, so these fixtures must carry real central-catalog truth.

INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status)
VALUES
  ('store-1003', 'domain-groceries', 'approved'),
  ('store-1006', 'domain-pharmacy', 'approved'),
  ('store-test-electronics', 'domain-electronics', 'approved')
ON CONFLICT (store_id, domain_id) DO UPDATE SET
  status = 'approved',
  updated_at = NOW();

INSERT INTO dsh_master_products
  (id, domain_id, category_node_id, canonical_name_ar, canonical_name_en,
   brand, sku, unit, measurement_type, approval_status, is_active,
   created_source)
VALUES
  ('product-1006-pain-relief', 'domain-pharmacy', 'node-pain-relief',
   'بنادول إكسترا مسكن سريع للألم 24 قرص', 'Panadol Extra Fast Pain Relief 24 Tablets', 'Panadol', 'PANADOL-EXTRA-24',
   'pack', 'unit', 'approved', TRUE, 'client-storefront-seed'),
  ('product-electronics-android-phone', 'domain-electronics', 'node-android-phones',
   'هاتف أندرويد ذكي 128GB شاشة AMOLED', 'Android Smartphone 128GB AMOLED 120Hz', 'سامسونج',
   'SAMSUNG-A54-128GB', 'piece', 'unit', 'approved', TRUE,
   'client-storefront-seed')
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category_node_id = EXCLUDED.category_node_id,
  canonical_name_ar = EXCLUDED.canonical_name_ar,
  canonical_name_en = EXCLUDED.canonical_name_en,
  brand = EXCLUDED.brand,
  sku = EXCLUDED.sku,
  unit = EXCLUDED.unit,
  measurement_type = EXCLUDED.measurement_type,
  approval_status = 'approved',
  is_active = TRUE,
  created_source = EXCLUDED.created_source,
  updated_at = NOW();

INSERT INTO dsh_store_assortments
  (id, store_id, master_product_id, unit_price, currency, available,
   stock_status, local_note, publication_status, submitted_by, approved_by)
VALUES
  ('assortment-store-1003-rice', 'store-1003', 'product-1001-rice',
   18200, 'YER', TRUE, 'in_stock', 'متاح في فرع شارع تعز',
   'client_visible', 'system-seed', 'system-seed'),
  ('assortment-store-1006-pain-relief', 'store-1006', 'product-1006-pain-relief',
   1500, 'YER', TRUE, 'in_stock', 'عبوة دوائية تجريبية محلية',
   'client_visible', 'system-seed', 'system-seed'),
  ('assortment-store-electronics-phone', 'store-test-electronics',
   'product-electronics-android-phone', 125000, 'YER', TRUE, 'in_stock',
   'هاتف ذكي متاح للعرض المحلي', 'client_visible', 'system-seed',
   'system-seed')
ON CONFLICT (store_id, master_product_id) DO UPDATE SET
  unit_price = EXCLUDED.unit_price,
  currency = EXCLUDED.currency,
  available = TRUE,
  stock_status = EXCLUDED.stock_status,
  local_note = EXCLUDED.local_note,
  publication_status = 'client_visible',
  submitted_by = EXCLUDED.submitted_by,
  approved_by = EXCLUDED.approved_by,
  updated_at = NOW();

-- Every client-visible seed product owns an approved DAM-backed canonical image.
-- The objects below are part of media/media-manifest.json and are uploaded to
-- MinIO before the catalog readback proof runs. public_url remains NULL because
-- centralcatalog derives /dsh/public/media/{assetId}/original from the asset id.
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, original_file_name, mime_type, size_bytes,
   width, height, checksum_sha256, alt_ar, alt_en, dominant_color, status,
   source_surface, uploaded_by)
VALUES
  ('asset-public-product-rice', 'products/product-canned-tuna.png', NULL,
   'product-canned-tuna.png', 'image/png', 1385, 600, 600,
   '3b7d3dfbf86b0ded9280a4315d906c4afbebf910d7fddee1f27b04712c7277ab',
   'أرز بسمتي', 'Basmati Rice', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-croissant', 'products/product-chocolate-box.png', NULL,
   'product-chocolate-box.png', 'image/png', 1370, 600, 600,
   '188fa42f1dc5f1ad2527a949e9a541ddbb897e6445988338d15af4fa9050eb49',
   'كرواسون زبدة طازج', 'Fresh Butter Croissant', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-wheatbread', 'products/product-cheese-kraft.png', NULL,
   'product-cheese-kraft.png', 'image/png', 406, 600, 600,
   'b0ed87a2585d3106c179ecc862e54579f552fd3bca10df006eb93d56d3f29214',
   'خبز قمح كامل', 'Whole Wheat Bread', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-milk', 'products/product-aptamil-1.png', NULL,
   'product-aptamil-1.png', 'image/png', 1361, 600, 600,
   'cab344c57dac2424ddf8fc030fb2dddb57d6a581dfa382921961f092fad7f24a',
   'حليب كامل الدسم', 'Full Cream Milk', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-apple', 'products/product-imported-banana.png', NULL,
   'product-imported-banana.png', 'image/png', 1027, 600, 600,
   '57393e9ac1a4e9e2681de4c5a53cac1f2dd49bd1242a72a7e1d0bae5b5a0a5a8',
   'تفاح رويال غالا', 'Royal Gala Apple', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-meal', 'products/product_example.png', NULL,
   'product_example.png', 'image/png', 674438, 600, 600,
   '396a56270b3bbef02a8a1c088d1bcb9723fdfd8f3f9cb169fcfcc8d9f3890924',
   'وجبة المدينة', 'City Meal', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-pain-relief', 'products/product-panadol-advance.png', NULL,
   'product-panadol-advance.png', 'image/png', 1385, 600, 600,
   '792746d4fc6f4c118025c932740e0d94df6ffcca9aa6a80529d4b33279b3e357',
   'مسكن ألم عام', 'General Pain Relief', '#ffffff', 'approved', 'system', 'system-seed')
ON CONFLICT (id) DO UPDATE SET
  object_key = EXCLUDED.object_key,
  public_url = EXCLUDED.public_url,
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

INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status)
VALUES
  ('link-public-product-rice', 'asset-public-product-rice', 'master_product',
   'product-1001-rice', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-croissant', 'asset-public-product-croissant', 'master_product',
   'product-1002-croissant', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-wheatbread', 'asset-public-product-wheatbread', 'master_product',
   'product-1002-wheatbread', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-milk', 'asset-public-product-milk', 'master_product',
   'product-1001-milk', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-apple', 'asset-public-product-apple', 'master_product',
   'product-1001-apple', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-meal', 'asset-public-product-meal', 'master_product',
   'product-1005-meal', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-pain-relief', 'asset-public-product-pain-relief', 'master_product',
   'product-1006-pain-relief', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-public-product-android-phone', 'asset-node-android-phones', 'master_product',
   'product-electronics-android-phone', 'canonical_product_image', 0, TRUE, 'approved')
ON CONFLICT (entity_type, entity_id, role, asset_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_primary = TRUE,
  status = 'approved',
  updated_at = NOW();
