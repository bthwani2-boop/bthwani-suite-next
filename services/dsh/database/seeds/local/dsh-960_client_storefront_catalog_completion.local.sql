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
   'مسكن ألم عام', 'General Pain Relief', 'صيدلية معين', 'PAIN-RELIEF-001',
   'pack', 'unit', 'approved', TRUE, 'client-storefront-seed'),
  ('product-electronics-android-phone', 'domain-electronics', 'node-android-phones',
   'هاتف أندرويد ذكي', 'Android Smartphone', 'إلكترونيات المستقبل',
   'ANDROID-PHONE-001', 'piece', 'unit', 'approved', TRUE,
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
  ('asset-public-product-rice', 'realistic/product-grocery-1.jpg', NULL,
   'realistic/product-grocery-1.jpg', 'image/jpeg', 15000, 600, 600,
   '9846be634085d6171a37c5173bd9d550764fd8de8d90717a8cc8b0bf678e9045',
   'أرز بسمتي', 'Basmati Rice', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-croissant', 'realistic/product-grocery-2.jpg', NULL,
   'realistic/product-grocery-2.jpg', 'image/jpeg', 15000, 600, 600,
   '3114fe0bf4fd7e89eba19eddd9d62617e1657873e4aa4cd244a6989cbe273b76',
   'كرواسون زبدة طازج', 'Fresh Butter Croissant', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-wheatbread', 'realistic/product-grocery-3.jpg', NULL,
   'realistic/product-grocery-3.jpg', 'image/jpeg', 15000, 600, 600,
   'd80a9933d0a661e31f9e755aaef203ee0953af48cf0acde530702048724d62f3',
   'خبز قمح كامل', 'Whole Wheat Bread', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-milk', 'realistic/product-grocery-4.jpg', NULL,
   'realistic/product-grocery-4.jpg', 'image/jpeg', 15000, 600, 600,
   '9d88931275370fb50912e71b44c8a12dc5ef87f5e6736b0f72eda8b19b5c0c22',
   'حليب كامل الدسم', 'Full Cream Milk', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-apple', 'realistic/product-grocery-5.jpg', NULL,
   'realistic/product-grocery-5.jpg', 'image/jpeg', 15000, 600, 600,
   'bcb79125d17ae842ce95d3727ad4910caec2e2415522d2f81ee9731da123cd2e',
   'تفاح رويال غالا', 'Royal Gala Apple', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-meal', 'realistic/product-restaurant-1.jpg', NULL,
   'realistic/product-restaurant-1.jpg', 'image/jpeg', 15000, 600, 600,
   'af7f1c62a62dc976b722989b9895437eadd714c1fbe36d3cbb492981fd6a1abd',
   'وجبة المدينة', 'City Meal', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-public-product-pain-relief', 'realistic/product-pharmacy-1.jpg', NULL,
   'realistic/product-pharmacy-1.jpg', 'image/jpeg', 15000, 600, 600,
   '49e51806aa78f4b6ddd0f443e7f127cbeb79d2ee6753d665a54a48559e896825',
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
