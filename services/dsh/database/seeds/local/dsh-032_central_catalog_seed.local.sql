-- Central catalog seed (idempotent UPSERT). Re-running this always converges
-- stale/partial rows to the current canonical seed values, unlike dsh-030's
-- ON CONFLICT DO NOTHING which silently no-ops once a row exists.

INSERT INTO dsh_catalog_domains (id, slug, name_ar, name_en, icon, sort_order, requires_product_catalog, is_manual_request) VALUES
  ('domain-restaurants',    'restaurants',    'مطاعم',          'Restaurants',    '🍽️', 10, TRUE,  FALSE),
  ('domain-groceries',      'groceries',      'مقاضي',          'Groceries',      '🛒', 20, TRUE,  FALSE),
  ('domain-sweets-juices',  'sweets_juices',  'حلا وعصائر',      'Sweets & Juices','🍰', 30, TRUE,  FALSE),
  ('domain-pharmacy',       'pharmacy',       'صيدلية',          'Pharmacy',       '💊', 35, TRUE,  FALSE),
  ('domain-elegance',       'elegance',       'أناقتي',         'Elegance',       '✨', 40, TRUE,  FALSE),
  ('domain-bthwani-store',  'bthwani_store',  'بثواني ستور',     'Bthwani Store',  '📦', 50, TRUE,  FALSE),
  ('domain-home-projects',  'home_projects',  'مشاريع منزلية',   'Home Projects',  '🏠', 60, TRUE,  FALSE),
  ('domain-spare-parts',    'spare_parts',    'قطع غيار',        'Spare Parts',    '🔧', 70, TRUE,  FALSE),
  ('domain-honey-dates',    'honey_dates',    'عسل وتمور',       'Honey & Dates',  '🍯', 80, TRUE,  FALSE),
  ('domain-electronics',    'electronics',    'إلكترونيات',      'Electronics',    '📱', 90, TRUE,  FALSE),
  ('domain-cloud-kitchens', 'cloud_kitchens', 'مطابخ سحابية',    'Cloud Kitchens', '👩‍🍳', 100, TRUE, FALSE),
  ('domain-manual-request', 'manual_request', 'طلب يدوي',        'Manual Request', '📝', 110, FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  requires_product_catalog = EXCLUDED.requires_product_catalog,
  is_manual_request = EXCLUDED.is_manual_request,
  is_active = TRUE,
  is_client_visible = TRUE,
  updated_at = NOW();

INSERT INTO dsh_catalog_nodes (id, domain_id, parent_id, level, slug, name_ar, name_en, sort_order, requires_product_catalog, allows_store_product_custom_image) VALUES
  -- groceries
  ('node-supermarket',        'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'supermarket',        'سوبر ماركت',        'Supermarket',        10, TRUE, FALSE),
  ('node-vegetables-fruits',  'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'vegetables_fruits',  'خضروات وفواكه',      'Vegetables & Fruits',20, TRUE, FALSE),
  ('node-meat-fish-poultry',  'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'meat_fish_poultry',  'لحوم وأسماك ودجاج',  'Meat, Fish & Poultry',30, TRUE, FALSE),
  ('node-roasters-spices',    'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'roasters_spices',    'محامص وبهارات',      'Roasters & Spices',  40, TRUE, FALSE),
  ('node-bakeries',           'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'bakeries',           'مخابز',             'Bakeries',           50, TRUE, TRUE),
  ('node-bundles-offers',     'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'bundles_offers',     'باكج عروضات',       'Bundles & Offers',   60, TRUE, TRUE),
  -- sweets_juices
  ('node-fresh-juices', 'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'fresh_juices', 'عصائر طازجة', 'Fresh Juices', 10, TRUE, TRUE),
  ('node-sweets',       'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'sweets',       'حلويات',      'Sweets',       20, TRUE, TRUE),
  ('node-ice-cream',    'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'ice_cream',    'آيسكريم',     'Ice Cream',    30, TRUE, FALSE),
  -- elegance
  ('node-perfumes',           'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'perfumes',           'عطور',                 'Perfumes',              10, TRUE, FALSE),
  ('node-beauty-accessories', 'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'beauty_accessories', 'إكسسوارات وأدوات تجميل','Beauty Accessories',    20, TRUE, FALSE),
  ('node-clothing',           'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'clothing',           'ملابس',                'Clothing',              30, TRUE, FALSE),
  ('node-awnak',   'domain-manual-request', NULL, 'BUSINESS_SUBDOMAIN', 'awnak',   'عونك',   'Awnak',   20, FALSE, FALSE),
  -- sub-classifications under groceries (node-supermarket)
  ('node-dairy-cheese',       'domain-groceries', 'node-supermarket', 'PRODUCT_MAIN_CLASS', 'dairy_cheese',       'ألبان وأجبان',      'Dairy & Cheese',     11, TRUE, FALSE),
  ('node-canned-food',        'domain-groceries', 'node-supermarket', 'PRODUCT_MAIN_CLASS', 'canned_food',        'أغذية معلبة',       'Canned Food',        12, TRUE, FALSE),
  -- sub-classifications under groceries (node-vegetables-fruits)
  ('node-local-vegetables',   'domain-groceries', 'node-vegetables-fruits', 'PRODUCT_MAIN_CLASS', 'local_vegetables',   'خضروات محلية',      'Local Vegetables',   21, TRUE, FALSE),
  ('node-imported-fruits',    'domain-groceries', 'node-vegetables-fruits', 'PRODUCT_MAIN_CLASS', 'imported_fruits',    'فواكه مستوردة',     'Imported Fruits',    22, TRUE, FALSE),
  -- sub-classifications under sweets_juices (node-sweets)
  ('node-sweets-cake',        'domain-sweets-juices', 'node-sweets', 'PRODUCT_MAIN_CLASS', 'sweets_cake',        'كيك وتورتات',       'Cakes & Tortes',     21, TRUE, TRUE),
  ('node-sweets-chocolate',   'domain-sweets-juices', 'node-sweets', 'PRODUCT_MAIN_CLASS', 'sweets_chocolate',   'شوكولاتة فاخرة',     'Fine Chocolates',    22, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  sort_order = EXCLUDED.sort_order,
  requires_product_catalog = EXCLUDED.requires_product_catalog,
  allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image,
  updated_at = NOW();

INSERT INTO dsh_catalog_platform_policies (id, policy_scope, notes)
VALUES ('default-policy', 'default', 'Platform-wide fallback catalog policy (dsh-030 seed).')
ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW();

INSERT INTO dsh_catalog_platform_policies (id, node_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-node-' || id, id, 'node', TRUE, 'Custom store image allowed by default (dsh-030 seed).'
FROM dsh_catalog_nodes
WHERE slug IN ('bakeries', 'bundles_offers', 'fresh_juices', 'sweets')
ON CONFLICT (id) DO UPDATE SET allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image, updated_at = NOW();

INSERT INTO dsh_catalog_platform_policies (id, domain_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-domain-' || id, id, 'domain', TRUE, 'Custom store image allowed by default (dsh-030 seed).'
FROM dsh_catalog_domains
WHERE slug IN ('restaurants', 'cloud_kitchens', 'home_projects')
ON CONFLICT (id) DO UPDATE SET allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image, updated_at = NOW();

INSERT INTO dsh_catalog_platform_policies (id, node_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-node-' || id, id, 'node', FALSE, 'Custom store image disallowed by default (dsh-030 seed).'
FROM dsh_catalog_nodes
WHERE slug IN ('supermarket', 'perfumes', 'beauty_accessories', 'roasters_spices', 'meat_fish_poultry')
ON CONFLICT (id) DO UPDATE SET allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image, updated_at = NOW();

INSERT INTO dsh_catalog_platform_policies (id, domain_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-domain-' || id, id, 'domain', FALSE, 'Custom store image disallowed by default (dsh-030 seed).'
FROM dsh_catalog_domains
WHERE slug IN ('electronics', 'spare_parts', 'honey_dates')
ON CONFLICT (id) DO UPDATE SET allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image, updated_at = NOW();

-- Canonical local-development products. These are real sovereign master
-- products, not screen-local fixtures and not per-store product truth.
INSERT INTO dsh_master_products
  (id, domain_id, category_node_id, canonical_name_ar, canonical_name_en,
   brand, sku, unit, measurement_type, approval_status, is_active,
   created_source)
VALUES
  ('product-1001-rice', 'domain-groceries', 'node-supermarket',
   'أرز بسمتي', 'Basmati Rice', 'بثواني', 'RICE-5KG', '5 kg', 'weight',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-1005-meal', 'domain-restaurants', NULL,
   'وجبة المدينة', 'City Meal', 'مطعم المدينة', 'CITY-MEAL', 'meal', 'unit',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-1005-croissant', 'domain-groceries', 'node-bakeries',
   'كرواسون زبدة طازج', 'Fresh Butter Croissant', 'مخبز المدينة',
   'CROISSANT-01', 'piece', 'unit', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1005-wheatbread', 'domain-groceries', 'node-bakeries',
   'خبز قمح كامل', 'Whole Wheat Bread', 'مخبز المدينة', 'WHEATBREAD-01',
   'loaf', 'unit', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1005-milk', 'domain-groceries', 'node-supermarket',
   'حليب كامل الدسم', 'Full Cream Milk', 'بثواني', 'ORGANIC-MILK',
   '1 L', 'volume', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1005-apple', 'domain-groceries', 'node-vegetables-fruits',
   'تفاح رويال غالا', 'Royal Gala Apple', 'بثواني', 'ROYAL-GALA',
   '1 kg', 'weight', 'approved', TRUE, 'central-catalog-seed'),
  -- mock products for subcategories
  ('product-cheese-kraft', 'domain-groceries', 'node-dairy-cheese',
   'جبنة كرافت شيدر علب', 'Kraft Cheddar Cheese', 'كرافت', 'KRAFT-CHEDDAR-50G', '50g', 'weight',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-canned-tuna', 'domain-groceries', 'node-canned-food',
   'تونة حدائق كاليفورنيا قطعة واحدة', 'California Gardens Tuna Solid', 'حدائق كاليفورنيا', 'CG-TUNA-185G', '185g', 'weight',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-local-tomato', 'domain-groceries', 'node-local-vegetables',
   'طماطم بلدي طازج', 'Fresh Local Tomatoes', 'بلدي', 'LOCAL-TOMATO-1KG', '1 kg', 'weight',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-imported-banana', 'domain-groceries', 'node-imported-fruits',
   'موز سكري مستورد', 'Sweet Imported Bananas', 'مستورد', 'IMPORTED-BANANA-1KG', '1 kg', 'weight',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-chocolate-box', 'domain-sweets-juices', 'node-sweets-chocolate',
   'علبة شوكولاتة باتشي فاخرة', 'Patchi Chocolate Luxury Box', 'باتشي', 'PATCHI-BOX-500G', '500g', 'weight',
   'approved', TRUE, 'central-catalog-seed')
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
  ('assortment-store-1001-rice', 'store-1001', 'product-1001-rice',
   18000, 'YER', TRUE, 'in_stock', 'عبوة 5 كجم', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-meal', 'store-1005', 'product-1005-meal',
   1800, 'YER', TRUE, 'in_stock', 'وجبة رئيسية', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-croissant', 'store-1005', 'product-1005-croissant',
   500, 'YER', TRUE, 'in_stock', 'طازج يومياً', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-wheatbread', 'store-1005', 'product-1005-wheatbread',
   300, 'YER', TRUE, 'in_stock', 'خبز قمح كامل', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-milk', 'store-1005', 'product-1005-milk',
   1100, 'YER', TRUE, 'in_stock', 'حليب طازج', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-apple', 'store-1005', 'product-1005-apple',
    1800, 'YER', TRUE, 'in_stock', 'تفاح طازج', 'client_visible',
    'system-seed', 'system-seed'),
  ('assortment-store-cheese-kraft', 'store-1005', 'product-cheese-kraft',
    1200, 'YER', TRUE, 'in_stock', 'عبوة معدنية', 'client_visible',
    'system-seed', 'system-seed'),
  ('assortment-store-canned-tuna', 'store-1005', 'product-canned-tuna',
    1500, 'YER', TRUE, 'in_stock', 'سهلة الفتح', 'client_visible',
    'system-seed', 'system-seed'),
  ('assortment-store-local-tomato', 'store-1005', 'product-local-tomato',
    900, 'YER', TRUE, 'in_stock', 'إنتاج مزارع صنعاء', 'client_visible',
    'system-seed', 'system-seed'),
  ('assortment-store-imported-banana', 'store-1005', 'product-imported-banana',
     1100, 'YER', TRUE, 'in_stock', 'موز طازج', 'client_visible',
     'system-seed', 'system-seed'),
  ('assortment-store-chocolate-box', 'store-1005', 'product-chocolate-box',
     25000, 'YER', TRUE, 'in_stock', 'هدية فاخرة', 'client_visible',
     'system-seed', 'system-seed')
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

-- DAM assets for new subcategories and mock products
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, original_file_name, mime_type, size_bytes, width, height, checksum_sha256, alt_ar, alt_en, dominant_color, status, source_surface, uploaded_by)
VALUES
  ('asset-node-dairy-cheese',      'node-dairy-cheese.png',      'http://localhost:59000/dsh-media/node-dairy-cheese.png',      'cheese.png',    'image/png', 1024, 512, 512, 'sha256', 'ألبان وأجبان',      'Dairy & Cheese',     '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-canned-food',       'node-canned-food.png',       'http://localhost:59000/dsh-media/node-canned-food.png',       'canned.png',    'image/png', 1024, 512, 512, 'sha256', 'أغذية معلبة',       'Canned Food',        '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-local-vegetables',  'node-local-vegetables.png',  'http://localhost:59000/dsh-media/node-local-vegetables.png',  'vegetables.png','image/png', 1024, 512, 512, 'sha256', 'خضروات محلية',      'Local Vegetables',   '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-imported-fruits',   'node-imported-fruits.png',   'http://localhost:59000/dsh-media/node-imported-fruits.png',   'fruits.png',    'image/png', 1024, 512, 512, 'sha256', 'فواكه مستوردة',     'Imported Fruits',    '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-sweets-cake',       'node-sweets-cake.png',       'http://localhost:59000/dsh-media/node-sweets-cake.png',       'cake.png',      'image/png', 1024, 512, 512, 'sha256', 'كيك وتورتات',       'Cakes & Tortes',     '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-sweets-chocolate',  'node-sweets-chocolate.png',  'http://localhost:59000/dsh-media/node-sweets-chocolate.png',  'chocolate.png', 'image/png', 1024, 512, 512, 'sha256', 'شوكولاتة فاخرة',     'Fine Chocolates',    '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-product-cheese-kraft',   'product-cheese-kraft.png',   'http://localhost:59000/dsh-media/product-cheese-kraft.png',   'kraft.png',     'image/png', 1024, 512, 512, 'sha256', 'جبنة كرافت شيدر',    'Kraft Cheddar Cheese','#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-product-canned-tuna',    'product-canned-tuna.png',    'http://localhost:59000/dsh-media/product-canned-tuna.png',    'tuna.png',      'image/png', 1024, 512, 512, 'sha256', 'تونة حدائق كاليفورنيا','California Tuna',    '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-product-local-tomato',   'product-local-tomato.png',   'http://localhost:59000/dsh-media/product-local-tomato.png',   'tomato.png',    'image/png', 1024, 512, 512, 'sha256', 'طماطم بلدي',        'Local Tomato',       '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-product-imported-banana', 'product-imported-banana.png', 'http://localhost:59000/dsh-media/product-imported-banana.png', 'banana.png',    'image/png', 1024, 512, 512, 'sha256', 'موز مستورد',        'Imported Banana',    '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-product-chocolate-box',  'product-chocolate-box.png',  'http://localhost:59000/dsh-media/product-chocolate-box.png',  'patchi.png',    'image/png', 1024, 512, 512, 'sha256', 'علبة شوكولاتة باتشي', 'Patchi Chocolate Box','#ffffff', 'approved', 'system', 'system-seed')
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
  status = EXCLUDED.status,
  source_surface = EXCLUDED.source_surface,
  uploaded_by = EXCLUDED.uploaded_by,
  updated_at = NOW();

-- DAM asset links for new subcategories and mock products
INSERT INTO dsh_catalog_asset_links
  (id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status)
VALUES
  ('link-node-dairy-cheese',      'asset-node-dairy-cheese',      'node',           'node-dairy-cheese',      'cover',                   0, TRUE, 'approved'),
  ('link-node-canned-food',       'asset-node-canned-food',       'node',           'node-canned-food',       'cover',                   0, TRUE, 'approved'),
  ('link-node-local-vegetables',  'asset-node-local-vegetables',  'node',           'node-local-vegetables',  'cover',                   0, TRUE, 'approved'),
  ('link-node-imported-fruits',   'asset-node-imported-fruits',   'node',           'node-imported-fruits',   'cover',                   0, TRUE, 'approved'),
  ('link-node-sweets-cake',       'asset-node-sweets-cake',       'node',           'node-sweets-cake',       'cover',                   0, TRUE, 'approved'),
  ('link-node-sweets-chocolate',  'asset-node-sweets-chocolate',  'node',           'node-sweets-chocolate',  'cover',                   0, TRUE, 'approved'),
  ('link-product-cheese-kraft',   'asset-product-cheese-kraft',   'master_product', 'product-cheese-kraft',   'canonical_product_image', 0, TRUE, 'approved'),
  ('link-product-canned-tuna',    'asset-product-canned-tuna',    'master_product', 'product-canned-tuna',    'canonical_product_image', 0, TRUE, 'approved'),
  ('link-product-local-tomato',   'asset-product-local-tomato',   'master_product', 'product-local-tomato',   'canonical_product_image', 0, TRUE, 'approved'),
  ('link-product-imported-banana', 'asset-product-imported-banana', 'master_product', 'product-imported-banana', 'canonical_product_image', 0, TRUE, 'approved'),
  ('link-product-chocolate-box',  'asset-product-chocolate-box',  'master_product', 'product-chocolate-box',  'canonical_product_image', 0, TRUE, 'approved')
ON CONFLICT (entity_type, entity_id, role, asset_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  updated_at = NOW();
