-- Local-only governed Home Discovery marketing fixtures.
--
-- This seed runs after the canonical catalog seeds. It publishes
-- banners and promos explicitly because dsh-060 adds draft-by-default gates
-- before local rows are inserted. Local media is optional.



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
