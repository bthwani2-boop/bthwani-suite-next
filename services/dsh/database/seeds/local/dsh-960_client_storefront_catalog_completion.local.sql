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
