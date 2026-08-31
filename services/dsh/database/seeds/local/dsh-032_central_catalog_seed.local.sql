-- Central catalog seed (idempotent UPSERT). Re-running this always converges
-- stale/partial rows to the current canonical seed values, unlike dsh-030's
-- ON CONFLICT DO NOTHING which silently no-ops once a row exists.
-- Media metadata and links are intentionally absent: local media is an explicit
-- overlay generated from services/dsh/database/seeds/media/local-media.manifest.json.

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
  ('node-supermarket',        'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'supermarket',        'سوبر ماركت',        'Supermarket',        10, TRUE, FALSE),
  ('node-vegetables-fruits',  'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'vegetables_fruits',  'خضروات وفواكه',      'Vegetables & Fruits',20, TRUE, FALSE),
  ('node-meat-fish-poultry',  'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'meat_fish_poultry',  'لحوم وأسماك ودجاج',  'Meat, Fish & Poultry',30, TRUE, FALSE),
  ('node-roasters-spices',    'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'roasters_spices',    'محامص وبهارات',      'Roasters & Spices',  40, TRUE, FALSE),
  ('node-bakeries',           'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'bakeries',           'مخابز',             'Bakeries',           50, TRUE, TRUE),
  ('node-bundles-offers',     'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'bundles_offers',     'باكج عروضات',       'Bundles & Offers',   60, TRUE, TRUE),
  ('node-fresh-juices', 'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'fresh_juices', 'عصائر طازجة', 'Fresh Juices', 10, TRUE, TRUE),
  ('node-sweets',       'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'sweets',       'حلويات',      'Sweets',       20, TRUE, TRUE),
  ('node-ice-cream',    'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'ice_cream',    'آيسكريم',     'Ice Cream',    30, TRUE, FALSE),
  ('node-perfumes',           'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'perfumes',           'عطور',                 'Perfumes',              10, TRUE, FALSE),
  ('node-beauty-accessories', 'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'beauty_accessories', 'إكسسوارات وأدوات تجميل','Beauty Accessories',    20, TRUE, FALSE),
  ('node-clothing',           'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'clothing',           'ملابس',                'Clothing',              30, TRUE, FALSE),
  ('node-shein',   'domain-manual-request', NULL, 'BUSINESS_SUBDOMAIN', 'shein',   'شي ان',   'SHEIN',   10, FALSE, FALSE),
  ('node-awnak',   'domain-manual-request', NULL, 'BUSINESS_SUBDOMAIN', 'awnak',   'عونك',   'Awnak',   20, FALSE, FALSE),
  ('node-dairy-cheese',       'domain-groceries', 'node-supermarket', 'PRODUCT_MAIN_CLASS', 'dairy_cheese',       'ألبان وأجبان',      'Dairy & Cheese',     11, TRUE, FALSE),
  ('node-canned-food',        'domain-groceries', 'node-supermarket', 'PRODUCT_MAIN_CLASS', 'canned_food',        'أغذية معلبة',       'Canned Food',        12, TRUE, FALSE),
  ('node-local-vegetables',   'domain-groceries', 'node-vegetables-fruits', 'PRODUCT_MAIN_CLASS', 'local_vegetables',   'خضروات محلية',      'Local Vegetables',   21, TRUE, FALSE),
  ('node-imported-fruits',    'domain-groceries', 'node-vegetables-fruits', 'PRODUCT_MAIN_CLASS', 'imported_fruits',    'فواكه مستوردة',     'Imported Fruits',    22, TRUE, FALSE),
  ('node-sweets-cake',        'domain-sweets-juices', 'node-sweets', 'PRODUCT_MAIN_CLASS', 'sweets_cake',        'كيك وتورتات',       'Cakes & Tortes',     21, TRUE, TRUE),
  ('node-sweets-chocolate',   'domain-sweets-juices', 'node-sweets', 'PRODUCT_MAIN_CLASS', 'sweets_chocolate',   'شوكولاتة فاخرة',     'Fine Chocolates',    22, TRUE, TRUE),
  ('node-phones-tablets',     'domain-electronics', NULL, 'BUSINESS_SUBDOMAIN', 'phones_tablets',     'هواتف وأجهزة لوحية',  'Phones & Tablets',   10, TRUE, FALSE),
  ('node-smartphones',        'domain-electronics', 'node-phones-tablets', 'PRODUCT_MAIN_CLASS', 'smartphones',        'هواتف ذكية',         'Smartphones',        11, TRUE, FALSE),
  ('node-android-phones',     'domain-electronics', 'node-smartphones', 'PRODUCT_SUB_CLASS', 'android_phones',     'هواتف أندرويد',      'Android Phones',     12, TRUE, FALSE),
  ('node-ios-phones',         'domain-electronics', 'node-smartphones', 'PRODUCT_SUB_CLASS', 'ios_phones',         'هواتف آيفون',        'iOS Phones',         13, TRUE, FALSE),
  ('node-medications',        'domain-pharmacy', NULL, 'BUSINESS_SUBDOMAIN', 'medications',        'أدوية وعلاجات',      'Medications',        10, TRUE, FALSE),
  ('node-baby-care',          'domain-pharmacy', NULL, 'BUSINESS_SUBDOMAIN', 'baby_care',          'عناية بالطفل',        'Baby Care',          20, TRUE, FALSE),
  ('node-pain-relief',        'domain-pharmacy', 'node-medications', 'PRODUCT_MAIN_CLASS', 'pain_relief',        'مسكنات الألم',       'Pain Relief',        11, TRUE, FALSE),
  ('node-baby-milk',          'domain-pharmacy', 'node-baby-care', 'PRODUCT_MAIN_CLASS', 'baby_milk',          'حليب أطفال',         'Baby Milk',          21, TRUE, FALSE),
  ('node-headache-migraine',  'domain-pharmacy', 'node-pain-relief', 'PRODUCT_SUB_CLASS', 'headache_migraine',  'صداع وشقيقة',        'Headache & Migraine',12, TRUE, FALSE),
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
  ('store-test-electronics', 'domain-electronics', 'approved'),
  ('store-test-grocery', 'domain-restaurants', 'approved'),
  ('store-test-grocery', 'domain-pharmacy', 'approved'),
  ('store-test-grocery', 'domain-electronics', 'approved'),
  ('store-test-grocery', 'domain-sweets-juices', 'approved')
ON CONFLICT DO NOTHING;

INSERT INTO dsh_master_products
  (id, domain_id, category_node_id, canonical_name_ar, canonical_name_en,
   brand, sku, unit, measurement_type, approval_status, is_active,
   created_source)
VALUES
  ('product-1001-rice', 'domain-groceries', 'node-supermarket',
   'أرز بسمتي هندي سيلا 5 كجم', 'Indian Sella Basmati Rice 5kg', 'الشعلان', 'RICE-SELLA-5KG', '5 kg', 'weight',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-1005-meal', 'domain-restaurants', NULL,
   'وجبة مندي لحم بلدي مع الأرز', 'Mandi Fresh Meat Meal with Rice', 'مطعم المدينة', 'MANDI-MEAT-01', 'meal', 'unit',
   'approved', TRUE, 'central-catalog-seed'),
  ('product-1002-croissant', 'domain-groceries', 'node-bakeries',
   'كرواسون فرنسي طازج بالزبدة', 'Fresh French Butter Croissant', 'مخبز السبعين',
   'CROISSANT-FR-01', 'piece', 'unit', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1002-wheatbread', 'domain-groceries', 'node-bakeries',
   'خبز قمح كامل طازج', 'Fresh Whole Wheat Bread', 'مخبز السبعين', 'WHEATBREAD-01',
   'loaf', 'unit', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1001-milk', 'domain-groceries', 'node-supermarket',
   'حليب مجفف كامل الدسم 900 جم', 'Full Cream Milk Powder 900g', 'المراعي', 'MILK-POWDER-900G',
   '900 g', 'weight', 'approved', TRUE, 'central-catalog-seed'),
  ('product-1001-apple', 'domain-groceries', 'node-vegetables-fruits',
   'تفاح أحمر رويال غالا 1 كجم', 'Royal Gala Red Apple 1kg', 'أسواق حدة', 'APPLE-GALA-1KG',
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
  (id, store_id, master_product_id, local_note, publication_status,
   submitted_by, approved_by)
VALUES
  ('assortment-store-test-grocery-rice', 'store-test-grocery', 'product-1001-rice',
   'عبوة 5 كجم', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1005-meal', 'store-1005', 'product-1005-meal',
   'وجبة رئيسية', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1002-croissant', 'store-1002', 'product-1002-croissant',
   'طازج يومياً', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-1002-wheatbread', 'store-1002', 'product-1002-wheatbread',
   'خبز قمح كامل', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-test-grocery-milk', 'store-test-grocery', 'product-1001-milk',
   'حليب طازج', 'client_visible',
   'system-seed', 'system-seed'),
  ('assortment-store-test-grocery-apple', 'store-test-grocery', 'product-1001-apple',
   'تفاح طازج', 'client_visible',
   'system-seed', 'system-seed')
ON CONFLICT (store_id, master_product_id) DO UPDATE SET
  local_note = EXCLUDED.local_note,
  publication_status = 'client_visible',
  submitted_by = EXCLUDED.submitted_by,
  approved_by = EXCLUDED.approved_by,
  updated_at = NOW();
