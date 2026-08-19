-- LEGACY_FILENAME_ONLY — not a slice reference
-- Home Discovery local seed. Marketing rows are created media-neutral and
-- inactive; the explicit local-media overlay is the only authority allowed to
-- attach local binary URLs and activate them.

INSERT INTO dsh_home_banners (id, title, subtitle, image_url, action_type, action_target, sort_order, is_active)
VALUES
  ('banner-001', 'اكتشف أفضل المطاعم', 'خيارات مميزة في صنعاء', '', 'category', 'domain-restaurants', 1, FALSE),
  ('banner-002', 'عروض حصرية', 'خصومات تصل إلى 50%', '', 'store', 'store-test-grocery', 2, FALSE)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  image_url = EXCLUDED.image_url,
  action_type = EXCLUDED.action_type,
  action_target = EXCLUDED.action_target,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO dsh_home_promos (id, title, subtitle, badge_label, image_url, action_type, action_target, is_active)
VALUES
  ('promo-001', 'توصيل مجاني', 'لأول 3 طلبات', 'مجاني', '', 'none', '', FALSE),
  ('promo-002', 'مطعم الشارع القديم', 'أعلى تقييم في صنعاء', 'الأعلى تقييمًا', '', 'store', 'store-1005', FALSE)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  badge_label = EXCLUDED.badge_label,
  image_url = EXCLUDED.image_url,
  action_type = EXCLUDED.action_type,
  action_target = EXCLUDED.action_target,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Home category cards and store classification are projections of the
-- sovereign central catalog. Store-domain links are seeded by
-- dsh-001_store_discovery.local.sql; no local category rows exist.
