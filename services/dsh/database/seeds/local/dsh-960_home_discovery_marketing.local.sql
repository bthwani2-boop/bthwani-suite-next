-- Local-only governed Home Discovery cleanup.
--
-- The legacy local seed-media overlay was retired. Keep its historical seed
-- identity, but remove the old published marketing rows so media-neutral
-- runtime truth cannot expose references to assets that no longer exist.
DELETE FROM dsh_home_content_targets
WHERE (content_kind = 'banners' AND content_id IN ('banner-001', 'banner-002'))
   OR (content_kind = 'promos' AND content_id IN ('promo-001', 'promo-002'));

DELETE FROM dsh_home_banners
WHERE id IN ('banner-001', 'banner-002');

DELETE FROM dsh_home_promos
WHERE id IN ('promo-001', 'promo-002');
