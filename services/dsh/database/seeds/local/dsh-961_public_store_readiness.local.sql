-- Local-only convergence for the complete public-store publication predicate.
--
-- Earlier fixtures provided identity, governance, catalog and media truth but
-- predated the field-onboarding readiness columns. Keep the production
-- predicate fail-closed and make the governed local fixtures complete instead.

UPDATE dsh_stores
SET address_line = CASE id
      WHEN 'store-test-grocery' THEN 'شارع حدة، جوار جولة المصباحي، صنعاء'
      WHEN 'store-1002' THEN 'شارع السبعين، جوار مستشفى السبعين، صنعاء'
      WHEN 'store-1003' THEN 'شارع تعز، جوار جولة تعز، صنعاء'
      WHEN 'store-1004' THEN 'شارع الزبيري، وسط صنعاء'
      WHEN 'store-1005' THEN 'باب اليمن، المدينة القديمة، صنعاء'
      WHEN 'store-1006' THEN 'شارع الستين، منطقة معين، صنعاء'
      WHEN 'store-test-electronics' THEN 'شارع حدة، مركز المستقبل، صنعاء'
      ELSE address_line
    END,
    coverage_summary = CASE id
      WHEN 'store-test-grocery' THEN 'حدة والأحياء المجاورة ضمن نطاق 8 كم'
      WHEN 'store-1002' THEN 'السبعين والأحياء المجاورة ضمن نطاق 7 كم'
      WHEN 'store-1003' THEN 'شارع تعز والأحياء المجاورة ضمن نطاق 6 كم'
      WHEN 'store-1004' THEN 'الزبيري والأحياء المجاورة ضمن نطاق 5 كم'
      WHEN 'store-1005' THEN 'المدينة القديمة ومركز صنعاء ضمن نطاق 6 كم'
      WHEN 'store-1006' THEN 'معين والستين والأحياء المجاورة ضمن نطاق 8 كم'
      WHEN 'store-test-electronics' THEN 'صنعاء ضمن نطاق توصيل 10 كم'
      ELSE coverage_summary
    END,
    operating_hours = CASE id
      WHEN 'store-1002' THEN 'يوميًا 05:30-22:30'
      WHEN 'store-1006' THEN 'يوميًا 08:00-24:00'
      ELSE 'يوميًا 08:00-23:00'
    END,
    delivery_readiness = CASE
      WHEN status = 'active' THEN 'ready'
      ELSE 'paused'
    END,
    storefront_photo_ref = CASE id
      WHEN 'store-test-grocery' THEN '/dsh-media/realistic/store-test-grocery-hero.jpg'
      WHEN 'store-1002' THEN '/dsh-media/realistic/store-test-sweets-hero.jpg'
      WHEN 'store-1003' THEN '/dsh-media/realistic/store-test-grocery-hero.jpg'
      WHEN 'store-1004' THEN '/dsh-media/realistic/store-test-grocery-hero.jpg'
      WHEN 'store-1005' THEN '/dsh-media/realistic/store-test-restaurant-hero.jpg'
      WHEN 'store-1006' THEN '/dsh-media/realistic/store-test-pharmacy-hero.jpg'
      WHEN 'store-test-electronics' THEN '/dsh-media/realistic/store-test-electronics-hero.jpg'
      ELSE storefront_photo_ref
    END,
    interior_photo_ref = CASE id
      WHEN 'store-test-grocery' THEN '/dsh-media/realistic/store-test-grocery-interior.jpg'
      WHEN 'store-1002' THEN '/dsh-media/realistic/store-test-sweets-interior.jpg'
      WHEN 'store-1003' THEN '/dsh-media/realistic/store-test-grocery-interior.jpg'
      WHEN 'store-1004' THEN '/dsh-media/realistic/store-test-grocery-interior.jpg'
      WHEN 'store-1005' THEN '/dsh-media/realistic/store-test-restaurant-interior.jpg'
      WHEN 'store-1006' THEN '/dsh-media/realistic/store-test-pharmacy-interior.jpg'
      WHEN 'store-test-electronics' THEN '/dsh-media/realistic/store-test-electronics-interior.jpg'
      ELSE interior_photo_ref
    END,
    signage_photo_ref = CASE id
      WHEN 'store-test-grocery' THEN '/dsh-media/realistic/store-test-grocery-logo.jpg'
      WHEN 'store-1002' THEN '/dsh-media/realistic/store-test-sweets-logo.jpg'
      WHEN 'store-1003' THEN '/dsh-media/realistic/store-test-grocery-logo.jpg'
      WHEN 'store-1004' THEN '/dsh-media/realistic/store-test-grocery-logo.jpg'
      WHEN 'store-1005' THEN '/dsh-media/realistic/store-test-restaurant-logo.jpg'
      WHEN 'store-1006' THEN '/dsh-media/realistic/store-test-pharmacy-logo.jpg'
      WHEN 'store-test-electronics' THEN '/dsh-media/realistic/store-test-electronics-logo.jpg'
      ELSE signage_photo_ref
    END,
    updated_at = NOW()
WHERE tenant_id = 'local-dsh'
  AND id IN (
    'store-test-grocery',
    'store-1002',
    'store-1003',
    'store-1004',
    'store-1005',
    'store-1006',
    'store-test-electronics'
  );

-- Future local fixtures may be introduced by a migration or a later seed. Any
-- row already governed as client-visible must also converge the field-readiness
-- facts instead of silently disappearing from the public repository predicate.
UPDATE dsh_stores
SET address_line = CASE
      WHEN btrim(COALESCE(address_line, '')) = ''
        THEN display_name || '، ' || COALESCE(NULLIF(city_code, ''), 'sana')
      ELSE address_line
    END,
    coverage_summary = CASE
      WHEN btrim(COALESCE(coverage_summary, '')) = ''
        THEN 'نطاق ' || COALESCE(NULLIF(service_area_code, ''), NULLIF(city_code, ''), 'sana')
      ELSE coverage_summary
    END,
    operating_hours = CASE
      WHEN btrim(COALESCE(operating_hours, '')) = '' THEN 'يوميًا 08:00-23:00'
      ELSE operating_hours
    END,
    delivery_readiness = 'ready',
    storefront_photo_ref = CASE
      WHEN btrim(COALESCE(storefront_photo_ref, '')) = ''
        THEN COALESCE(NULLIF(hero_image_url, ''), '/dsh-media/realistic/' || id || '-hero.jpg')
      ELSE storefront_photo_ref
    END,
    interior_photo_ref = CASE
      WHEN btrim(COALESCE(interior_photo_ref, '')) = ''
        THEN COALESCE(NULLIF(hero_image_url, ''), '/dsh-media/realistic/' || id || '-interior.jpg')
      ELSE interior_photo_ref
    END,
    signage_photo_ref = CASE
      WHEN btrim(COALESCE(signage_photo_ref, '')) = ''
        THEN COALESCE(NULLIF(logo_url, ''), '/dsh-media/realistic/' || id || '-logo.jpg')
      ELSE signage_photo_ref
    END,
    updated_at = NOW()
WHERE tenant_id = 'local-dsh'
  AND status = 'active'
  AND is_visible = true
  AND partner_readiness = 'ready'
  AND catalog_approval_status = 'approved'
  AND marketing_visibility = 'visible';
