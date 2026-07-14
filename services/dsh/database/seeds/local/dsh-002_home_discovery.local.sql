-- LEGACY_FILENAME_ONLY — not a slice reference
-- Home Discovery: Home Discovery local seed
-- Inserts banners/promos and projects store classification onto central domains.

-- Banners
INSERT INTO dsh_home_banners (id, title, subtitle, image_url, action_type, action_target, sort_order)
VALUES
  (
    'banner-001',
    'اكتشف أفضل المطاعم',
    'خيارات مميزة في صنعاء',
    'http://localhost:59000/dsh-media/banner-001.png',
    'category',
    'domain-restaurants',
    1
  ),
  (
    'banner-002',
    'عروض حصرية',
    'خصومات تصل إلى 50%',
    'http://localhost:59000/dsh-media/banner-002.png',
    'store',
    'store-test-grocery',
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
    'http://localhost:59000/dsh-media/promo-001.png',
    'none',
    ''
  ),
  (
    'promo-002',
    'مطعم الشارع القديم',
    'أعلى تقييم في صنعاء',
    'الأعلى تقييمًا',
    'http://localhost:59000/dsh-media/store-1005-hero.png',
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

-- Home category cards and store classification are projections of the
-- sovereign central catalog. Store-domain links are seeded by
-- dsh-001_store_discovery.local.sql; no local category rows exist.
