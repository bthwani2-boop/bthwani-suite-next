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
      'banners/banner-001.png',
      NULL,
      'banner-001.png',
      'image/png', 844, 1200, 600,
      'd1b5d40c767d0fce7673d56ce591b3f00e79d5bbd0f67210048ec238403415ec',
      'مطاعم مختارة بعناية', 'Curated restaurants', '#ffffff',
      'approved', 'system', 'system-seed'
    ),
    (
      'asset-local-home-banner-offers',
      'banners/banner-002.png',
      NULL,
      'banner-002.png',
      'image/png', 637, 1200, 600,
      '601ff490aa42e3ae767f4b141437d885d32ee6fc45b9ce89b7a46ee3613fbbb7',
      'عروض يومية موفرة', 'Daily savings', '#ffffff',
      'approved', 'system', 'system-seed'
    ),
    (
      'asset-local-home-promo-free-delivery',
      'banners/promo-001.png',
      NULL,
      'promo-001.png',
      'image/png', 1359, 1200, 600,
      '00e0d6d64c6597b362eb944eb3efd28e730c3683377bf68feaa522cadc88a936',
      'عرض توصيل مجاني', 'Free delivery offer', '#ffffff',
      'approved', 'system', 'system-seed'
    ),
    (
      'asset-local-home-promo-top-rated',
      'banners/promo-002.png',
      NULL,
      'promo-002.png',
      'image/png', 1359, 1200, 600,
      '00e0d6d64c6597b362eb944eb3efd28e730c3683377bf68feaa522cadc88a936',
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
