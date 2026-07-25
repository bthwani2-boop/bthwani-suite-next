-- Local-only governed Home Discovery marketing fixtures.
--
-- This seed runs after the canonical catalog and store-media seeds. It publishes
-- banners and promos explicitly because dsh-060 adds draft-by-default gates
-- before local rows are inserted. Media remains private in MinIO and is exposed
-- to app-client only through the DSH public media route.

INSERT INTO dsh_catalog_assets (
    id, object_key, public_url, original_file_name, mime_type, size_bytes,
    width, height, checksum_sha256, alt_ar, alt_en, dominant_color,
    status, source_surface, uploaded_by
) VALUES
    (
      'asset-local-home-banner-restaurants',
      'realistic/store-test-restaurant-hero.jpg',
      NULL,
      'realistic/store-test-restaurant-hero.jpg',
      'image/jpeg', 0, 1200, 600,
      '94d218b4b3d7a7891d27e04b78dcfe6da91ac38f766d16c6cabc133020b07871',
      'مطاعم مختارة بعناية', 'Curated restaurants', '#ffffff',
      'approved', 'system', 'system-seed'
    ),
    (
      'asset-local-home-banner-offers',
      'realistic/store-test-grocery-hero.jpg',
      NULL,
      'realistic/store-test-grocery-hero.jpg',
      'image/jpeg', 0, 1200, 600,
      '04cd18a893fd3e314db85de9818c86eafe2756190ab2412e8e7b260cf3c4d0b8',
      'عروض يومية موفرة', 'Daily savings', '#ffffff',
      'approved', 'system', 'system-seed'
    ),
    (
      'asset-local-home-promo-free-delivery',
      'realistic/store-test-pharmacy-hero.jpg',
      NULL,
      'realistic/store-test-pharmacy-hero.jpg',
      'image/jpeg', 0, 1200, 600,
      '7dddabe1344a88bf5bd45bc7d38dead0600f7a0346e8d1c914dbfa069c962ebb',
      'عرض توصيل مجاني', 'Free delivery offer', '#ffffff',
      'approved', 'system', 'system-seed'
    ),
    (
      'asset-local-home-promo-top-rated',
      'realistic/store-test-restaurant-hero.jpg',
      NULL,
      'realistic/store-test-restaurant-hero.jpg',
      'image/jpeg', 0, 1200, 600,
      '94d218b4b3d7a7891d27e04b78dcfe6da91ac38f766d16c6cabc133020b07871',
      'اختيار العملاء', 'Customers choice', '#ffffff',
      'approved', 'system', 'system-seed'
    )
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
    source_surface = 'system',
    uploaded_by = 'system-seed',
    updated_at = NOW();

INSERT INTO dsh_home_banners (
    id, title, subtitle, image_url, action_type, action_target, sort_order,
    is_active, publication_status, publish_from, publish_until,
    created_by_actor_id, approved_by_actor_id, approved_at
) VALUES
    (
      'banner-001',
      'اكتشف نكهات تستحق التجربة',
      'مختارات مميزة في صنعاء',
      '/dsh/public/media/asset-local-home-banner-restaurants/original',
      'category', 'domain-restaurants', 1,
      TRUE, 'published', NULL, NULL,
      'system-seed', 'system-seed', NOW()
    ),
    (
      'banner-002',
      'وفر أكثر في طلباتك اليومية',
      'عروض حصرية لفترة محدودة',
      '/dsh/public/media/asset-local-home-banner-offers/original',
      'store', 'store-test-grocery', 2,
      TRUE, 'published', NULL, NULL,
      'system-seed', 'system-seed', NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    image_url = EXCLUDED.image_url,
    action_type = EXCLUDED.action_type,
    action_target = EXCLUDED.action_target,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    publication_status = 'published',
    publish_from = NULL,
    publish_until = NULL,
    created_by_actor_id = CASE
      WHEN dsh_home_banners.created_by_actor_id = '' THEN 'system-seed'
      ELSE dsh_home_banners.created_by_actor_id
    END,
    approved_by_actor_id = 'system-seed',
    approved_at = NOW(),
    updated_at = NOW();

INSERT INTO dsh_home_promos (
    id, title, subtitle, badge_label, image_url, action_type, action_target,
    sort_order, is_active, publication_status, publish_from, publish_until,
    created_by_actor_id, approved_by_actor_id, approved_at
) VALUES
    (
      'promo-001',
      'التوصيل علينا',
      'لأول 3 طلبات',
      'مجاني',
      '/dsh/public/media/asset-local-home-promo-free-delivery/original',
      'none', '', 1,
      TRUE, 'published', NULL, NULL,
      'system-seed', 'system-seed', NOW()
    ),
    (
      'promo-002',
      'اختيار العملاء',
      'مطعم المدينة القديمة',
      'الأعلى تقييمًا',
      '/dsh/public/media/asset-local-home-promo-top-rated/original',
      'store', 'store-1005', 2,
      TRUE, 'published', NULL, NULL,
      'system-seed', 'system-seed', NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    badge_label = EXCLUDED.badge_label,
    image_url = EXCLUDED.image_url,
    action_type = EXCLUDED.action_type,
    action_target = EXCLUDED.action_target,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    publication_status = 'published',
    publish_from = NULL,
    publish_until = NULL,
    created_by_actor_id = CASE
      WHEN dsh_home_promos.created_by_actor_id = '' THEN 'system-seed'
      ELSE dsh_home_promos.created_by_actor_id
    END,
    approved_by_actor_id = 'system-seed',
    approved_at = NOW(),
    updated_at = NOW();

-- Local fixtures are intentionally available to all current local city,
-- service-area, and guest/authenticated contexts. Production targeting remains
-- managed exclusively through the governed operator surface.
DELETE FROM dsh_home_content_targets
WHERE (content_kind = 'banners' AND content_id IN ('banner-001', 'banner-002'))
   OR (content_kind = 'promos' AND content_id IN ('promo-001', 'promo-002'));
