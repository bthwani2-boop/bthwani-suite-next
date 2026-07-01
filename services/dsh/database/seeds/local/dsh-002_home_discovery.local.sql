-- LEGACY_FILENAME_ONLY — not a slice reference
-- Home Discovery: Home Discovery local seed
-- Inserts banners, promos, categories, and links stores to categories

-- Banners
INSERT INTO dsh_home_banners (id, title, subtitle, image_url, action_type, action_target, sort_order)
VALUES
  (
    'banner-001',
    'اكتشف متاجر جديدة',
    'أفضل العروض في صنعاء',
    'http://localhost:59000/dsh-media/banner-001.jpg',
    'category',
    'all',
    1
  ),
  (
    'banner-002',
    'عروض حصرية',
    'خصومات تصل إلى 50%',
    'http://localhost:59000/dsh-media/banner-002.jpg',
    'store',
    'store-1001',
    2
  )
ON CONFLICT (id) DO UPDATE SET
  title        = EXCLUDED.title,
  subtitle     = EXCLUDED.subtitle,
  image_url    = EXCLUDED.image_url,
  action_type  = EXCLUDED.action_type,
  action_target = EXCLUDED.action_target,
  sort_order   = EXCLUDED.sort_order,
  updated_at   = NOW();

-- Promos
INSERT INTO dsh_home_promos (id, title, subtitle, badge_label, image_url, action_type, action_target)
VALUES
  (
    'promo-001',
    'توصيل مجاني',
    'لأول 3 طلبات',
    'مجاني',
    'http://localhost:59000/dsh-media/promo-001.jpg',
    'none',
    ''
  ),
  (
    'promo-002',
    'مطعم الشارع القديم',
    'أعلى تقييم في صنعاء',
    'الأعلى تقييمًا',
    'http://localhost:59000/dsh-media/store-1005-hero.jpg',
    'store',
    'store-1005'
  )
ON CONFLICT (id) DO UPDATE SET
  title        = EXCLUDED.title,
  subtitle     = EXCLUDED.subtitle,
  badge_label  = EXCLUDED.badge_label,
  image_url    = EXCLUDED.image_url,
  action_type  = EXCLUDED.action_type,
  action_target = EXCLUDED.action_target,
  updated_at   = NOW();

-- Categories
INSERT INTO dsh_categories (id, label, sort_order)
VALUES
  ('cat-restaurant', 'مطاعم',  1),
  ('cat-grocery',    'بقالة',  2),
  ('cat-pharmacy',   'صيدلية', 3),
  ('cat-bakery',     'مخابز',  4),
  ('cat-default',    'أخرى',   5)
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Link dsh_stores to categories based on existing category column
UPDATE dsh_stores SET category_id = 'cat-restaurant' WHERE category = 'restaurant';
UPDATE dsh_stores SET category_id = 'cat-grocery'    WHERE category = 'grocery';
UPDATE dsh_stores SET category_id = 'cat-pharmacy'   WHERE category = 'pharmacy';
UPDATE dsh_stores SET category_id = 'cat-bakery'     WHERE category = 'bakery';
UPDATE dsh_stores SET category_id = 'cat-default'    WHERE category = 'default';
