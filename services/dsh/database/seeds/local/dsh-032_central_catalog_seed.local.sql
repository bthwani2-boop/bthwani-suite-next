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
  ('node-sweets-chocolate',   'domain-sweets-juices', 'node-sweets', 'PRODUCT_MAIN_CLASS', 'sweets_chocolate',   'شوكولاتة فاخرة',     'Fine Chocolates',    22, TRUE, TRUE),
  -- electronics
  ('node-phones-tablets',     'domain-electronics', NULL, 'BUSINESS_SUBDOMAIN', 'phones_tablets',     'هواتف وأجهزة لوحية',  'Phones & Tablets',   10, TRUE, FALSE),
  -- sub-classifications under electronics (node-phones-tablets)
  ('node-smartphones',        'domain-electronics', 'node-phones-tablets', 'PRODUCT_MAIN_CLASS', 'smartphones',        'هواتف ذكية',         'Smartphones',        11, TRUE, FALSE),
  -- sub-sub-classifications under electronics (node-smartphones)
  ('node-android-phones',     'domain-electronics', 'node-smartphones', 'PRODUCT_SUB_CLASS', 'android_phones',     'هواتف أندرويد',      'Android Phones',     12, TRUE, FALSE),
  ('node-ios-phones',         'domain-electronics', 'node-smartphones', 'PRODUCT_SUB_CLASS', 'ios_phones',         'هواتف آيفون',        'iOS Phones',         13, TRUE, FALSE),
  -- pharmacy
  ('node-medications',        'domain-pharmacy', NULL, 'BUSINESS_SUBDOMAIN', 'medications',        'أدوية وعلاجات',      'Medications',        10, TRUE, FALSE),
  ('node-baby-care',          'domain-pharmacy', NULL, 'BUSINESS_SUBDOMAIN', 'baby_care',          'عناية بالطفل',        'Baby Care',          20, TRUE, FALSE),
  -- sub-classifications under pharmacy (node-medications)
  ('node-pain-relief',        'domain-pharmacy', 'node-medications', 'PRODUCT_MAIN_CLASS', 'pain_relief',        'مسكنات الألم',       'Pain Relief',        11, TRUE, FALSE),
  -- sub-classifications under pharmacy (node-baby-care)
  ('node-baby-milk',          'domain-pharmacy', 'node-baby-care', 'PRODUCT_MAIN_CLASS', 'baby_milk',          'حليب أطفال',         'Baby Milk',          21, TRUE, FALSE),
  -- sub-sub-classifications under pharmacy (node-pain-relief)
  ('node-headache-migraine',  'domain-pharmacy', 'node-pain-relief', 'PRODUCT_SUB_CLASS', 'headache_migraine',  'صداع وشقيقة',        'Headache & Migraine',12, TRUE, FALSE),
  -- sub-sub-classifications under pharmacy (node-baby-milk)
  ('node-infant-formula',     'domain-pharmacy', 'node-baby-milk', 'PRODUCT_SUB_CLASS', 'infant_formula',     'تركيبة الرضع',        'Infant Formula',     22, TRUE, FALSE)
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
VALUES ('default-policy', 'default', 'Platform-wide test generic policy (dsh-030 seed).')
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

INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status)
VALUES 
  ('store-test-grocery', 'domain-groceries', 'approved'),
  ('store-1002', 'domain-groceries', 'approved'),
  ('store-1005', 'domain-restaurants', 'approved'),
  ('store-1006', 'domain-pharmacy', 'approved'),
  ('store-test-electronics', 'domain-electronics', 'approved')
ON CONFLICT DO NOTHING;

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
  ('product-1002-croissant', 'domain-groceries', 'node-bakeries',
   'كرواسون زبدة طازج', 'Fresh Butter Croissant', 'مخبز المدينة',
   'CROISSANT-01', 'piece', 'unit', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1002-wheatbread', 'domain-groceries', 'node-bakeries',
   'خبز قمح كامل', 'Whole Wheat Bread', 'مخبز المدينة', 'WHEATBREAD-01',
   'loaf', 'unit', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1001-milk', 'domain-groceries', 'node-supermarket',
   'حليب كامل الدسم', 'Full Cream Milk', 'بثواني', 'ORGANIC-MILK',
   '1 L', 'volume', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1001-apple', 'domain-groceries', 'node-vegetables-fruits',
   'تفاح رويال غالا', 'Royal Gala Apple', 'بثواني', 'ROYAL-GALA',
   '1 kg', 'weight', 'approved', TRUE, 'central-catalog-seed')
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
  ('assortment-store-test-grocery-rice', 'store-test-grocery', 'product-1001-rice',
   18000, 'YER', TRUE, 'in_stock', 'عبوة 5 كجم', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-meal', 'store-1005', 'product-1005-meal',
   1800, 'YER', TRUE, 'in_stock', 'وجبة رئيسية', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1002-croissant', 'store-1002', 'product-1002-croissant',
   500, 'YER', TRUE, 'in_stock', 'طازج يومياً', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1002-wheatbread', 'store-1002', 'product-1002-wheatbread',
   300, 'YER', TRUE, 'in_stock', 'خبز قمح كامل', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-test-grocery-milk', 'store-test-grocery', 'product-1001-milk',
   1100, 'YER', TRUE, 'in_stock', 'حليب طازج', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-test-grocery-apple', 'store-test-grocery', 'product-1001-apple',
    1800, 'YER', TRUE, 'in_stock', 'تفاح طازج', 'client_visible',
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

-- DAM assets for new subcategories and mock products.
--
-- object_key matches the flat filename Invoke-DshMediaSeed (infra/docker/scripts/runtime.ps1)
-- uploads from services/dsh/database/seeds/local/media/ into the dsh-media bucket, so these
-- rows only resolve to a real object once that script has actually run against a live MinIO --
-- unlike the previous version of this seed, which pointed 'approved' rows at localhost URLs
-- that were never backed by any uploaded file. public_url is left NULL: the runtime derives
-- the servable URL from object_key via GET /dsh/public/media/{assetId}/original
-- (see centralcatalog.publicMediaPath), so a stored public_url is unused legacy data.
-- size_bytes/checksum_sha256 are the real values of the checked-in placeholder PNGs
-- (generate with the same script used for `id`'s file if these are ever regenerated).
INSERT INTO dsh_catalog_assets
  (id, object_key, public_url, original_file_name, mime_type, size_bytes, width, height, checksum_sha256, alt_ar, alt_en, dominant_color, status, source_surface, uploaded_by)
VALUES
  ('asset-node-dairy-cheese', 'realistic/node-grocery.jpg', NULL, 'realistic/node-grocery.jpg', 'image/jpeg', 15000, 600, 600, '4c02401a5908cd8f1d2615c6eabf542f330eedc9d80efb7525d42ca7c0c1adba', 'ألبان وأجبان',        'Dairy & Cheese',       '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-canned-food', 'realistic/node-grocery.jpg', NULL, 'realistic/node-grocery.jpg', 'image/jpeg', 15000, 600, 600, '4c02401a5908cd8f1d2615c6eabf542f330eedc9d80efb7525d42ca7c0c1adba', 'أغذية معلبة',         'Canned Food',          '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-local-vegetables', 'realistic/node-grocery.jpg', NULL, 'realistic/node-grocery.jpg', 'image/jpeg', 15000, 600, 600, '4c02401a5908cd8f1d2615c6eabf542f330eedc9d80efb7525d42ca7c0c1adba', 'خضروات محلية',        'Local Vegetables',     '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-imported-fruits', 'realistic/node-grocery.jpg', NULL, 'realistic/node-grocery.jpg', 'image/jpeg', 15000, 600, 600, '4c02401a5908cd8f1d2615c6eabf542f330eedc9d80efb7525d42ca7c0c1adba', 'فواكه مستوردة',       'Imported Fruits',      '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-sweets-cake', 'realistic/node-sweets.jpg', NULL, 'realistic/node-sweets.jpg', 'image/jpeg', 15000, 600, 600, '43294ef1ee5dfead33b5dec63f9a623dd927f6f8d8f94a55354ccd639d3f3cdf', 'كيك وتورتات',         'Cakes & Tortes',       '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-sweets-chocolate', 'realistic/node-sweets.jpg', NULL, 'realistic/node-sweets.jpg', 'image/jpeg', 15000, 600, 600, '43294ef1ee5dfead33b5dec63f9a623dd927f6f8d8f94a55354ccd639d3f3cdf', 'شوكولاتة فاخرة',      'Fine Chocolates',      '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-phones-tablets', 'realistic/node-electronics.jpg', NULL, 'realistic/node-electronics.jpg', 'image/jpeg', 15000, 600, 600, 'c55eb4a492c2ac9d99915dc9bcbf9d54331244637bc3d384ab69596f99ca399f', 'هواتف وأجهزة لوحية',  'Phones & Tablets',   '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-smartphones', 'realistic/node-electronics.jpg', NULL, 'realistic/node-electronics.jpg', 'image/jpeg', 15000, 600, 600, 'c55eb4a492c2ac9d99915dc9bcbf9d54331244637bc3d384ab69596f99ca399f', 'هواتف ذكية',         'Smartphones',        '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-android-phones', 'realistic/node-electronics.jpg', NULL, 'realistic/node-electronics.jpg', 'image/jpeg', 15000, 600, 600, 'c55eb4a492c2ac9d99915dc9bcbf9d54331244637bc3d384ab69596f99ca399f', 'هواتف أندرويد',      'Android Phones',     '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-ios-phones', 'realistic/node-electronics.jpg', NULL, 'realistic/node-electronics.jpg', 'image/jpeg', 15000, 600, 600, 'c55eb4a492c2ac9d99915dc9bcbf9d54331244637bc3d384ab69596f99ca399f', 'هواتف آيفون',        'iOS Phones',         '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-medications', 'realistic/node-pharmacy.jpg', NULL, 'realistic/node-pharmacy.jpg', 'image/jpeg', 15000, 600, 600, 'da5ca14034897fa342e0c97944827ed8b025348a68803f85e895504b984eae0e', 'أدوية وعلاجات',       'Medications',         '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-baby-care', 'realistic/node-pharmacy.jpg', NULL, 'realistic/node-pharmacy.jpg', 'image/jpeg', 15000, 600, 600, 'da5ca14034897fa342e0c97944827ed8b025348a68803f85e895504b984eae0e', 'عناية بالطفل',         'Baby Care',           '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-pain-relief', 'realistic/node-pharmacy.jpg', NULL, 'realistic/node-pharmacy.jpg', 'image/jpeg', 15000, 600, 600, 'da5ca14034897fa342e0c97944827ed8b025348a68803f85e895504b984eae0e', 'مسكنات الألم',        'Pain Relief',         '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-baby-milk', 'realistic/node-pharmacy.jpg', NULL, 'realistic/node-pharmacy.jpg', 'image/jpeg', 15000, 600, 600, 'da5ca14034897fa342e0c97944827ed8b025348a68803f85e895504b984eae0e', 'حليب أطفال',          'Baby Milk',           '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-headache-migraine', 'realistic/node-pharmacy.jpg', NULL, 'realistic/node-pharmacy.jpg', 'image/jpeg', 15000, 600, 600, 'da5ca14034897fa342e0c97944827ed8b025348a68803f85e895504b984eae0e', 'صداع وشقيقة',         'Headache & Migraine', '#ffffff', 'approved', 'system', 'system-seed'),
  ('asset-node-infant-formula', 'realistic/node-pharmacy.jpg', NULL, 'realistic/node-pharmacy.jpg', 'image/jpeg', 15000, 600, 600, 'da5ca14034897fa342e0c97944827ed8b025348a68803f85e895504b984eae0e', 'تركيبة الرضع',         'Infant Formula',      '#ffffff', 'approved', 'system', 'system-seed')
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
  ('link-node-phones-tablets',    'asset-node-phones-tablets',    'node',           'node-phones-tablets',    'cover',                   0, TRUE, 'approved'),
  ('link-node-smartphones',       'asset-node-smartphones',       'node',           'node-smartphones',       'cover',                   0, TRUE, 'approved'),
  ('link-node-android-phones',    'asset-node-android-phones',    'node',           'node-android-phones',    'cover',                   0, TRUE, 'approved'),
  ('link-node-ios-phones',        'asset-node-ios-phones',        'node',           'node-ios-phones',        'cover',                   0, TRUE, 'approved'),
  ('link-node-medications',        'asset-node-medications',        'node',           'node-medications',        'cover',                   0, TRUE, 'approved'),
  ('link-node-baby-care',          'asset-node-baby-care',          'node',           'node-baby-care',          'cover',                   0, TRUE, 'approved'),
  ('link-node-pain-relief',        'asset-node-pain-relief',        'node',           'node-pain-relief',        'cover',                   0, TRUE, 'approved'),
  ('link-node-baby-milk',          'asset-node-baby-milk',          'node',           'node-baby-milk',          'cover',                   0, TRUE, 'approved'),
  ('link-node-headache-migraine',  'asset-node-headache-migraine',  'node',           'node-headache-migraine',  'cover',                   0, TRUE, 'approved'),
  ('link-node-infant-formula',     'asset-node-infant-formula',     'node',           'node-infant-formula',     'cover',                   0, TRUE, 'approved')
ON CONFLICT (entity_type, entity_id, role, asset_id) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  updated_at = NOW();
