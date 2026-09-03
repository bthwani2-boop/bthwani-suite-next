-- Canonical DSH Local Seed Baseline (Epoch 2)
-- Unified development fixtures for stores, partners, catalogs, pricing, service areas, and readiness.

-- ===========================================================================
-- Fixture block: dsh-001_store_discovery.local.sql
-- ===========================================================================
-- LEGACY_FILENAME_ONLY — not a slice reference
-- Store/catalog truth is media-neutral. The optional local-media overlay owns
-- hero/logo/DAM bindings and may populate those projections after validation.
INSERT INTO dsh_stores (
  id,
  operator_context_id,
  slug,
  display_name,
  status,
  city_code,
  service_area_code,
  serviceability_status,
  rating_average,
  rating_count,
  delivery_eta_min,
  delivery_eta_max,
  is_visible,
  hero_image_url,
  logo_url,
  catalog_domain_id,
  delivery_modes,
  is_free_delivery,
  distance_km,
  follower_count,
  has_pro_badge,
  has_coupon_badge,
  points_multiplier,
  is_popular,
  address_line,
  coverage_summary,
  operating_hours,
  delivery_readiness,
  storefront_photo_ref,
  interior_photo_ref,
  signage_photo_ref,
  latitude,
  longitude
) VALUES
  (
    'store-test-grocery', 'local-dsh', 'haddah-central-market', 'أسواق حدة المركزية', 'published',
    'sana', 'haddah', 'serviceable', 4.80, 312, 25, 40, true,
    NULL, NULL,
    'domain-groceries', ARRAY['delivery','pickup','express'], true,
    2.10, 3100, true, false, 2, true,
    'شارع حدة، جوار جولة المصباحي، صنعاء',
    'حدة والأحياء المجاورة ضمن نطاق 8 كم',
    'يوميًا 08:00-23:00', 'ready',
    NULL, NULL, NULL,
    15.3400, 44.1900
  ),
  (
    'store-1002', 'local-dsh', 'al-sabeen-bakery', 'مخبز السبعين', 'published',
    'sana', 'sabeen', 'serviceable', 4.60, 189, 20, 35, true,
    NULL, NULL,
    'domain-groceries', ARRAY['delivery','pickup'], true,
    1.80, 1200, true, true, null, false,
    'شارع السبعين، جوار مستشفى السبعين، صنعاء',
    'السبعين والأحياء المجاورة ضمن نطاق 7 كم',
    'يوميًا 05:30-22:30', 'ready',
    NULL, NULL, NULL,
    15.3300, 44.2000
  ),
  (
    'store-1003', 'local-dsh', 'taiz-street-market', 'سوق شارع تعز', 'published',
    'sana', 'taiz-st', 'limited', 4.20, 97, 35, 55, true,
    NULL, NULL,
    'domain-groceries', ARRAY['delivery','pickup'], false,
    3.50, 850, false, false, null, false,
    'شارع تعز، جوار جولة تعز، صنعاء',
    'شارع تعز والأحياء المجاورة ضمن نطاق 6 كم',
    'يوميًا 08:00-23:00', 'ready',
    NULL, NULL, NULL,
    15.3200, 44.1800
  ),
  (
    'store-1004', 'local-dsh', 'al-zubairi-grocery', 'بقالة الزبيري', 'paused',
    'sana', 'zubairi', 'unavailable', 4.50, 241, null, null, true,
    NULL, NULL,
    'domain-groceries', ARRAY['delivery'], false,
    1.20, 2400, true, false, null, false,
    'شارع الزبيري، وسط صنعاء',
    'الزبيري والأحياء المجاورة ضمن نطاق 5 كم',
    'يوميًا 08:00-23:00', 'paused',
    NULL, NULL, NULL,
    15.3600, 44.1700
  ),
  (
    'store-1005', 'local-dsh', 'old-city-restaurant', 'مطعم المدينة القديمة', 'published',
    'sana', 'old-city', 'serviceable', 4.90, 524, 15, 30, true,
    NULL, NULL,
    'domain-restaurants', ARRAY['delivery','pickup','express'], true,
    0.50, 5200, true, true, 3, true,
    'باب اليمن، المدينة القديمة، صنعاء',
    'المدينة القديمة ومركز صنعاء ضمن نطاق 6 كم',
    'يوميًا 08:00-23:00', 'ready',
    NULL, NULL, NULL,
    15.3560, 44.1800
  ),
  (
    'store-1006', 'local-dsh', 'maeen-pharmacy', 'صيدلية معين', 'published',
    'sana', 'maeen', 'serviceable', 4.70, 88, 20, 35, true,
    NULL, NULL,
    'domain-pharmacy', ARRAY['delivery'], true,
    4.10, 980, false, true, null, false,
    'شارع الستين، منطقة معين، صنعاء',
    'معين والستين والأحياء المجاورة ضمن نطاق 8 كم',
    'يوميًا 08:00-24:00', 'ready',
    NULL, NULL, NULL,
    15.3700, 44.1900
  ),
  (
    'store-test-electronics', 'local-dsh', 'test-electronics', 'إلكترونيات المستقبل', 'published',
    'sana', 'haddah', 'serviceable', 4.90, 500, 30, 60, true,
    NULL, NULL,
    'domain-electronics', ARRAY['delivery'], true,
    4.10, 980, false, true, null, false,
    'شارع حدة، مركز المستقبل، صنعاء',
    'صنعاء ضمن نطاق توصيل 10 كم',
    'يوميًا 08:00-23:00', 'ready',
    NULL, NULL, NULL,
    15.3700, 44.1900
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  display_name = EXCLUDED.display_name,
  status = EXCLUDED.status,
  city_code = EXCLUDED.city_code,
  service_area_code = EXCLUDED.service_area_code,
  serviceability_status = EXCLUDED.serviceability_status,
  rating_average = EXCLUDED.rating_average,
  rating_count = EXCLUDED.rating_count,
  delivery_eta_min = EXCLUDED.delivery_eta_min,
  delivery_eta_max = EXCLUDED.delivery_eta_max,
  is_visible = EXCLUDED.is_visible,
  hero_image_url = EXCLUDED.hero_image_url,
  logo_url = EXCLUDED.logo_url,
  catalog_domain_id = EXCLUDED.catalog_domain_id,
  delivery_modes = EXCLUDED.delivery_modes,
  is_free_delivery = EXCLUDED.is_free_delivery,
  distance_km = EXCLUDED.distance_km,
  follower_count = EXCLUDED.follower_count,
  has_pro_badge = EXCLUDED.has_pro_badge,
  has_coupon_badge = EXCLUDED.has_coupon_badge,
  points_multiplier = EXCLUDED.points_multiplier,
  is_popular = EXCLUDED.is_popular,
  address_line = EXCLUDED.address_line,
  coverage_summary = EXCLUDED.coverage_summary,
  operating_hours = EXCLUDED.operating_hours,
  delivery_readiness = EXCLUDED.delivery_readiness,
  storefront_photo_ref = EXCLUDED.storefront_photo_ref,
  interior_photo_ref = EXCLUDED.interior_photo_ref,
  signage_photo_ref = EXCLUDED.signage_photo_ref,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = now();


-- ===========================================================================
-- Fixture block: dsh-001b_store_governance.local.sql
-- ===========================================================================
-- LEGACY_FILENAME_ONLY — not a slice reference
INSERT INTO dsh_store_actor_scopes (actor_id, actor_role, store_id, scope_type)
VALUES
  ('partner-local-001', 'partner', 'store-test-grocery', 'own'),
  ('@@FIELD_ACTOR_ID@@', 'field', 'store-1002', 'assigned'),
  ('@@CAPTAIN_ACTOR_ID@@', 'captain', 'store-1005', 'assigned'),
  ('operator-local-001', 'operator', 'store-test-grocery', 'all')
ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE SET
  scope_type = EXCLUDED.scope_type,
  active = true;


-- ===========================================================================
-- Fixture block: dsh-002_home_discovery.local.sql
-- ===========================================================================
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


-- ===========================================================================
-- Fixture block: dsh-015_partner_lifecycle.local.sql
-- ===========================================================================
-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH partner onboarding and store publication local seed.
-- The audit trail below follows the backend state machine exactly.

INSERT INTO dsh_partners (
    id,
    operator_context_id,
    legal_name_ar,
    legal_name_en,
    display_name,
    legal_identity_type,
    legal_identity_number,
    owner_name,
    primary_phone,
    secondary_phone,
    email,
    category,
    activation_status,
    created_by_actor_id,
    created_by_surface,
    notes,
    version,
    created_at,
    updated_at
) VALUES (
    'prt_partner_local_001',
    'local-dsh',
    'مؤسسة أسواق حدة المركزية',
    'Haddah Central Market Est',
    'أسواق حدة المركزية',
    'commercial_register',
    'YE-CR-9900112233',
    'عبدالله محمد الحداد',
    '+967771111111',
    '+967771000002',
    'haddah.partner@local.test',
    'grocery',
    'client_visible',
    '@@FIELD_ACTOR_ID@@',
    'app-field',
    'ملف تأهيل شريك تجريبي محلي في صنعاء',
    8,
    now() - interval '2 days',
    now() - interval '12 hours'
) ON CONFLICT (id) DO UPDATE SET
    legal_name_ar = EXCLUDED.legal_name_ar,
    legal_name_en = EXCLUDED.legal_name_en,
    display_name = EXCLUDED.display_name,
    legal_identity_type = EXCLUDED.legal_identity_type,
    legal_identity_number = EXCLUDED.legal_identity_number,
    owner_name = EXCLUDED.owner_name,
    primary_phone = EXCLUDED.primary_phone,
    secondary_phone = EXCLUDED.secondary_phone,
    email = EXCLUDED.email,
    category = EXCLUDED.category,
    activation_status = EXCLUDED.activation_status,
    notes = EXCLUDED.notes,
    version = EXCLUDED.version,
    updated_at = EXCLUDED.updated_at;

-- This legal partner owns only the canonical Haddah grocery fixture. Other
-- local stores are assigned to their independent partners by dsh-958. Keeping
-- this update scoped makes the full seed set idempotent and prevents an older
-- seed from silently undoing governed ownership transfers on a second run.
UPDATE dsh_stores
SET partner_id = 'prt_partner_local_001',
    partner_readiness = 'ready',
    catalog_approval_status = 'approved',
    marketing_visibility = 'visible',
    updated_at = now()
WHERE id = 'store-test-grocery'
  AND operator_context_id = 'local-dsh';

INSERT INTO dsh_media_refs (
    media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id,
    store_id, purpose, content_type, original_filename
) VALUES
    ('media_cr_990011.jpg', 'local-seed/media_cr_990011.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_001', NULL, 'partner_document', 'image/jpeg', 'media_cr_990011.jpg'),
    ('media_id_partner1.jpg', 'local-seed/media_id_partner1.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_001', NULL, 'partner_document', 'image/jpeg', 'media_id_partner1.jpg'),
    ('media_visit_front_001.jpg', 'local-seed/media_visit_front_001.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_001', 'store-test-grocery', 'field_readiness_evidence', 'image/jpeg', 'media_visit_front_001.jpg'),
    ('media_visit_inside_001.jpg', 'local-seed/media_visit_inside_001.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_001', 'store-test-grocery', 'field_readiness_evidence', 'image/jpeg', 'media_visit_inside_001.jpg')
ON CONFLICT (media_ref) DO NOTHING;

INSERT INTO dsh_partner_documents (
    id,
    partner_id,
    document_type,
    document_status,
    upload_status,
    review_status,
    uploaded_by_actor_id,
    media_ref,
    notes,
    rejection_reason,
    reviewed_by_actor_id,
    reviewed_at,
    last_review_reason,
    version,
    created_at,
    updated_at
) VALUES
    (
        'doc_cr_001',
        'prt_partner_local_001',
        'commercial_register',
        'approved',
        'uploaded',
        'verified',
        '@@FIELD_ACTOR_ID@@',
        'media_cr_990011.jpg',
        'السجل التجاري الأصلي',
        '',
        'operator-local-001',
        now() - interval '1 day',
        'مستند رسمي معتمد ومطابق',
        2,
        now() - interval '2 days',
        now() - interval '1 day'
    ),
    (
        'doc_nid_001',
        'prt_partner_local_001',
        'national_id',
        'approved',
        'uploaded',
        'verified',
        '@@FIELD_ACTOR_ID@@',
        'media_id_partner1.jpg',
        'بطاقة الهوية الوطنية للمالك',
        '',
        'operator-local-001',
        now() - interval '1 day',
        'مطابق لهوية المالك المسجلة',
        2,
        now() - interval '2 days',
        now() - interval '1 day'
    )
ON CONFLICT (id) DO UPDATE SET
    document_status = EXCLUDED.document_status,
    upload_status = EXCLUDED.upload_status,
    review_status = EXCLUDED.review_status,
    notes = EXCLUDED.notes,
    rejection_reason = EXCLUDED.rejection_reason,
    reviewed_by_actor_id = EXCLUDED.reviewed_by_actor_id,
    reviewed_at = EXCLUDED.reviewed_at,
    last_review_reason = EXCLUDED.last_review_reason,
    version = EXCLUDED.version,
    updated_at = EXCLUDED.updated_at;

INSERT INTO dsh_partner_document_reviews (
    id,
    document_id,
    partner_id,
    reviewed_by_actor_id,
    decision,
    reason,
    correlation_id,
    created_at
) VALUES
    (
        'drev_cr_001',
        'doc_cr_001',
        'prt_partner_local_001',
        'operator-local-001',
        'approved',
        'مستند رسمي معتمد ومطابق',
        'corr_seed_dsh_015',
        now() - interval '1 day'
    ),
    (
        'drev_nid_001',
        'doc_nid_001',
        'prt_partner_local_001',
        'operator-local-001',
        'approved',
        'مطابق لهوية المالك المسجلة',
        'corr_seed_dsh_015',
        now() - interval '1 day'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO dsh_partner_field_visits (
    id,
    partner_id,
    store_id,
    field_actor_id,
    visit_status,
    visit_notes,
    location_latitude,
    location_longitude,
    evidence_media_refs,
    version,
    created_at,
    submitted_at
) VALUES (
    'pfv_001',
    'prt_partner_local_001',
    'store-test-grocery',
    '@@FIELD_ACTOR_ID@@',
    'submitted',
    'تمت الزيارة الميدانية في حدة - صنعاء والتأكد من مطابقة العنوان واللوحة',
    15.3229000,
    44.2075000,
    ARRAY['media_visit_front_001.jpg', 'media_visit_inside_001.jpg']::TEXT[],
    1,
    now() - interval '2 days',
    now() - interval '1 day'
) ON CONFLICT (id) DO UPDATE SET
    visit_status = EXCLUDED.visit_status,
    visit_notes = EXCLUDED.visit_notes,
    location_latitude = EXCLUDED.location_latitude,
    location_longitude = EXCLUDED.location_longitude,
    evidence_media_refs = EXCLUDED.evidence_media_refs,
    submitted_at = EXCLUDED.submitted_at;

INSERT INTO dsh_partner_field_visit_media (
    partner_id, visit_id, store_id, media_ref, captured_by_actor_id, context
)
SELECT 'prt_partner_local_001', 'pfv_001', 'store-test-grocery', refs.media_ref,
       '@@FIELD_ACTOR_ID@@', 'partner_onboarding'
FROM unnest(ARRAY['media_visit_front_001.jpg', 'media_visit_inside_001.jpg']::TEXT[]) AS refs(media_ref)
ON CONFLICT (visit_id, media_ref) DO NOTHING;

INSERT INTO dsh_partner_activation_events (
    id,
    partner_id,
    from_status,
    to_status,
    actor_id,
    actor_surface,
    reason,
    correlation_id,
    idempotency_key,
    created_at
) VALUES
    (
        'pae_001',
        'prt_partner_local_001',
        'draft',
        'submitted',
        '@@FIELD_ACTOR_ID@@',
        'app-field',
        'تقديم ملف الشريك من المندوب الميداني',
        'corr_seed_dsh_015',
        'idem_seed_001',
        now() - interval '2 days'
    ),
    (
        'pae_002',
        'prt_partner_local_001',
        'submitted',
        'documents_uploaded',
        'operator-local-001',
        'control-panel',
        'تسجيل اكتمال الوثائق المطلوبة',
        'corr_seed_dsh_015',
        'idem_seed_002',
        now() - interval '36 hours'
    ),
    (
        'pae_003',
        'prt_partner_local_001',
        'documents_uploaded',
        'documents_verified',
        'operator-local-001',
        'control-panel',
        'اعتماد جميع الوثائق المرفوعة في النظام',
        'corr_seed_dsh_015',
        'idem_seed_003',
        now() - interval '1 day'
    ),
    (
        'pae_004',
        'prt_partner_local_001',
        'documents_verified',
        'ops_review',
        'operator-local-001',
        'control-panel',
        'تحويل الملف إلى مراجعة العمليات',
        'corr_seed_dsh_015',
        'idem_seed_004',
        now() - interval '23 hours'
    ),
    (
        'pae_005',
        'prt_partner_local_001',
        'ops_review',
        'ops_approved',
        'operator-local-001',
        'control-panel',
        'اعتماد العمليات للملف المكتمل',
        'corr_seed_dsh_015',
        'idem_seed_005',
        now() - interval '22 hours'
    ),
    (
        'pae_006',
        'prt_partner_local_001',
        'ops_approved',
        'partner_active',
        'operator-local-001',
        'control-panel',
        'تفعيل الشريك بعد اكتمال الاعتماد',
        'corr_seed_dsh_015',
        'idem_seed_006',
        now() - interval '21 hours'
    ),
    (
        'pae_007',
        'prt_partner_local_001',
        'partner_active',
        'client_visible',
        'system',
        'system',
        'استيفاء شروط الظهور والجاهزية للعميل',
        'corr_seed_dsh_015',
        'idem_seed_007',
        now() - interval '12 hours'
    )
ON CONFLICT (id) DO NOTHING;


-- ===========================================================================
-- Fixture block: dsh-032_central_catalog_seed.local.sql
-- ===========================================================================
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


-- ===========================================================================
-- Fixture block: dsh-065_store_delivery_pricing.local.sql
-- ===========================================================================
-- Local-only governed delivery-pricing bootstrap.
--
-- DSH migrations run before local store seeds. Therefore dsh-065 cannot create
-- policies for stores that do not exist until the seed phase. This seed closes
-- that ordering gap without weakening checkout's fail-closed pricing rule.

WITH enabled_policies AS (
  SELECT
    s.id AS store_id,
    modes.fulfillment_mode,
    CASE
      WHEN modes.fulfillment_mode = 'pickup' THEN 0::bigint
      WHEN s.is_free_delivery THEN 0::bigint
      ELSE 95000::bigint
    END AS fee_minor_units
  FROM dsh_stores s
  CROSS JOIN LATERAL (
    VALUES
      ('bthwani_delivery'::text, 'express'::text),
      ('partner_delivery'::text, 'delivery'::text),
      ('pickup'::text, 'pickup'::text)
  ) AS modes(fulfillment_mode, delivery_mode)
  WHERE modes.delivery_mode = ANY(s.delivery_modes)
)
INSERT INTO dsh_store_delivery_pricing (
  store_id,
  fulfillment_mode,
  fee_minor_units,
  currency,
  status,
  pricing_source,
  created_by_actor_id,
  approved_by_actor_id,
  approved_at
)
SELECT
  store_id,
  fulfillment_mode,
  fee_minor_units,
  'YER',
  'active',
  'platform_default',
  'system:local-seed',
  'operator-local-001',
  NOW()
FROM enabled_policies
ON CONFLICT (store_id, fulfillment_mode) DO UPDATE SET
  fee_minor_units = EXCLUDED.fee_minor_units,
  currency = EXCLUDED.currency,
  status = 'active',
  pricing_source = EXCLUDED.pricing_source,
  approved_by_actor_id = EXCLUDED.approved_by_actor_id,
  approved_at = COALESCE(dsh_store_delivery_pricing.approved_at, EXCLUDED.approved_at),
  version = CASE
    WHEN dsh_store_delivery_pricing.fee_minor_units IS DISTINCT FROM EXCLUDED.fee_minor_units
      OR dsh_store_delivery_pricing.currency IS DISTINCT FROM EXCLUDED.currency
      OR dsh_store_delivery_pricing.status IS DISTINCT FROM 'active'
      OR dsh_store_delivery_pricing.pricing_source IS DISTINCT FROM EXCLUDED.pricing_source
    THEN dsh_store_delivery_pricing.version + 1
    ELSE dsh_store_delivery_pricing.version
  END,
  updated_at = NOW();

INSERT INTO dsh_store_delivery_pricing_audit (
  store_id,
  fulfillment_mode,
  actor_id,
  actor_surface,
  action,
  from_fee_minor_units,
  to_fee_minor_units,
  from_status,
  to_status,
  reason,
  correlation_id
)
SELECT
  p.store_id,
  p.fulfillment_mode,
  'system:local-seed',
  'system',
  'create',
  NULL,
  p.fee_minor_units,
  NULL,
  p.status,
  'local runtime bootstrap after store seed',
  'seed:dsh-065:' || p.store_id || ':' || p.fulfillment_mode
FROM dsh_store_delivery_pricing p
WHERE p.created_by_actor_id = 'system:local-seed'
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_store_delivery_pricing_audit a
    WHERE a.correlation_id = 'seed:dsh-065:' || p.store_id || ':' || p.fulfillment_mode
  );


-- ===========================================================================
-- Fixture block: dsh-076_service_area_geofences.local.sql
-- ===========================================================================
-- Local-only governed service-area truth for canonical Sana'a service areas.
-- The store, client-address and checkout integration path must share one DSH-owned
-- geofence instead of relying on a service_area_code label with no spatial truth.

DO $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_current RECORD;
    v_version INTEGER;
    v_effective_from TIMESTAMPTZ;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'haddah' AS code, 'حدة' AS name, ST_GeomFromText('POLYGON((44.1800 15.3300,44.2000 15.3300,44.2000 15.3500,44.1800 15.3500,44.1800 15.3300))', 4326) AS poly
        UNION ALL
        SELECT 'maeen', 'معين', ST_GeomFromText('POLYGON((44.1700 15.3500,44.2100 15.3500,44.2100 15.3900,44.1700 15.3900,44.1700 15.3500))', 4326)
        UNION ALL
        SELECT 'sabeen', 'السبعين', ST_GeomFromText('POLYGON((44.1800 15.3100,44.2200 15.3100,44.2200 15.3500,44.1800 15.3500,44.1800 15.3100))', 4326)
        UNION ALL
        SELECT 'taiz-st', 'شارع تعز', ST_GeomFromText('POLYGON((44.1600 15.3000,44.2000 15.3000,44.2000 15.3400,44.1600 15.3400,44.1600 15.3000))', 4326)
        UNION ALL
        SELECT 'zubairi', 'الزبيري', ST_GeomFromText('POLYGON((44.1500 15.3400,44.1900 15.3400,44.1900 15.3800,44.1500 15.3800,44.1500 15.3400))', 4326)
        UNION ALL
        SELECT 'old-city', 'المدينة القديمة', ST_GeomFromText('POLYGON((44.1600 15.3400,44.2000 15.3400,44.2000 15.3700,44.1600 15.3700,44.1600 15.3400))', 4326)
    ) LOOP
        SELECT
            display_name,
            polygon,
            active,
            priority,
            version,
            srid,
            overlap_policy,
            effective_from,
            expires_at
        INTO v_current
        FROM dsh_service_area_geofences
        WHERE service_area_code = r.code
        FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO dsh_service_area_geofences (
                service_area_code,
                display_name,
                polygon,
                active,
                priority,
                version,
                created_at,
                updated_at,
                srid,
                overlap_policy,
                effective_from,
                expires_at
            ) VALUES (
                r.code,
                r.name,
                r.poly,
                TRUE,
                100,
                1,
                v_now,
                v_now,
                4326,
                'priority_then_code',
                v_now,
                NULL
            );
        ELSIF v_current.display_name IS DISTINCT FROM r.name
           OR NOT ST_Equals(v_current.polygon, r.poly)
           OR v_current.active IS DISTINCT FROM TRUE
           OR v_current.priority IS DISTINCT FROM 100
           OR v_current.srid IS DISTINCT FROM 4326
           OR v_current.overlap_policy IS DISTINCT FROM 'priority_then_code'
           OR v_current.expires_at IS NOT NULL THEN
            UPDATE dsh_service_area_geofences
            SET display_name = r.name,
                polygon = r.poly,
                active = TRUE,
                priority = 100,
                version = v_current.version + 1,
                srid = 4326,
                overlap_policy = 'priority_then_code',
                effective_from = v_now,
                expires_at = NULL,
                updated_at = v_now
            WHERE service_area_code = r.code;
        END IF;

        SELECT version, effective_from
        INTO v_version, v_effective_from
        FROM dsh_service_area_geofences
        WHERE service_area_code = r.code;

        INSERT INTO dsh_service_area_versions (
            service_area_code,
            version,
            display_name,
            polygon,
            active,
            priority,
            srid,
            overlap_policy,
            effective_from,
            expires_at,
            actor_id,
            actor_surface,
            reason,
            correlation_id,
            created_at
        ) VALUES (
            r.code,
            v_version,
            r.name,
            r.poly,
            TRUE,
            100,
            4326,
            'priority_then_code',
            v_effective_from,
            NULL,
            'seed:dsh-076-local-service-area',
            'system',
            'canonical local service-area fixture for ' || r.name,
            'seed:dsh-076:' || r.code || ':v' || v_version::text,
            v_now
        )
        ON CONFLICT (service_area_code, version) DO NOTHING;
    END LOOP;
END;
$$;


-- ===========================================================================
-- Fixture block: dsh-077_operational_policy.local.sql
-- ===========================================================================
-- Local-only governed operational policy truth for canonical Sana'a service areas.
-- dsh-076 owns the spatial geofence. This seed supplies the operational zone,
-- SLA, capacity and fulfillment policies required by cart/checkout/order/dispatch.
-- Missing policy must stay fail-closed in product code; the local environment
-- therefore provisions the policy explicitly instead of bypassing the guard.

DO $$
DECLARE
    v_zone_id UUID;
    v_zone_count INTEGER;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'haddah' AS code, 'حدة' AS name, '00000000-0000-4000-8000-000000000077'::uuid AS static_id
        UNION ALL
        SELECT 'maeen', 'معين', '00000000-0000-4000-8000-000000001006'::uuid
        UNION ALL
        SELECT 'sabeen', 'السبعين', '00000000-0000-4000-8000-000000001002'::uuid
        UNION ALL
        SELECT 'taiz-st', 'شارع تعز', '00000000-0000-4000-8000-000000001003'::uuid
        UNION ALL
        SELECT 'zubairi', 'الزبيري', '00000000-0000-4000-8000-000000001004'::uuid
        UNION ALL
        SELECT 'old-city', 'المدينة القديمة', '00000000-0000-4000-8000-000000001005'::uuid
    ) LOOP
        SELECT COUNT(*)
        INTO v_zone_count
        FROM dsh_platform_zones
        WHERE lower(service_area_code) = lower(r.code);

        IF v_zone_count > 1 THEN
            SELECT id INTO v_zone_id FROM dsh_platform_zones WHERE lower(service_area_code) = lower(r.code) LIMIT 1;
        ELSIF v_zone_count = 0 THEN
            INSERT INTO dsh_platform_zones (
                id,
                name,
                service_area_code,
                is_active,
                description,
                version,
                created_at,
                updated_at
            ) VALUES (
                r.static_id,
                'تشغيل ' || r.name,
                r.code,
                TRUE,
                'Canonical local operational zone bound to the governed ' || r.name || ' service area.',
                1,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_zone_id;
        ELSE
            SELECT id
            INTO v_zone_id
            FROM dsh_platform_zones
            WHERE lower(service_area_code) = lower(r.code);

            UPDATE dsh_platform_zones
            SET is_active = TRUE,
                updated_at = CASE WHEN is_active IS DISTINCT FROM TRUE THEN NOW() ELSE updated_at END,
                version = CASE WHEN is_active IS DISTINCT FROM TRUE THEN version + 1 ELSE version END
            WHERE id = v_zone_id;
        END IF;

        INSERT INTO dsh_platform_sla_rules (
            zone_id,
            category,
            max_prep_mins,
            max_assignment_mins,
            max_delivery_mins,
            version,
            updated_by,
            created_at,
            updated_at
        ) VALUES (
            v_zone_id,
            'default',
            20,
            10,
            45,
            1,
            'seed:dsh-077-local-operational-policy',
            NOW(),
            NOW()
        )
        ON CONFLICT (zone_id, category) DO UPDATE
        SET max_prep_mins = EXCLUDED.max_prep_mins,
            max_assignment_mins = EXCLUDED.max_assignment_mins,
            max_delivery_mins = EXCLUDED.max_delivery_mins,
            updated_by = EXCLUDED.updated_by,
            version = dsh_platform_sla_rules.version + 1,
            updated_at = NOW()
        WHERE dsh_platform_sla_rules.max_prep_mins IS DISTINCT FROM EXCLUDED.max_prep_mins
           OR dsh_platform_sla_rules.max_assignment_mins IS DISTINCT FROM EXCLUDED.max_assignment_mins
           OR dsh_platform_sla_rules.max_delivery_mins IS DISTINCT FROM EXCLUDED.max_delivery_mins;

        INSERT INTO dsh_platform_capacity_configs (
            zone_id,
            max_concurrent_orders,
            max_captains_online,
            throttle_threshold,
            is_paused,
            pause_reason,
            version,
            updated_by,
            created_at,
            updated_at
        ) VALUES (
            v_zone_id,
            100,
            30,
            0.8,
            FALSE,
            '',
            1,
            'seed:dsh-077-local-operational-policy',
            NOW(),
            NOW()
        )
        ON CONFLICT (zone_id) DO UPDATE
        SET max_concurrent_orders = EXCLUDED.max_concurrent_orders,
            max_captains_online = EXCLUDED.max_captains_online,
            throttle_threshold = EXCLUDED.throttle_threshold,
            is_paused = EXCLUDED.is_paused,
            pause_reason = EXCLUDED.pause_reason,
            updated_by = EXCLUDED.updated_by,
            version = dsh_platform_capacity_configs.version + 1,
            updated_at = NOW()
        WHERE dsh_platform_capacity_configs.max_concurrent_orders IS DISTINCT FROM EXCLUDED.max_concurrent_orders
           OR dsh_platform_capacity_configs.max_captains_online IS DISTINCT FROM EXCLUDED.max_captains_online
           OR dsh_platform_capacity_configs.throttle_threshold IS DISTINCT FROM EXCLUDED.throttle_threshold
           OR dsh_platform_capacity_configs.is_paused IS DISTINCT FROM EXCLUDED.is_paused
           OR dsh_platform_capacity_configs.pause_reason IS DISTINCT FROM EXCLUDED.pause_reason;

        INSERT INTO dsh_platform_delivery_mode_policies (
            zone_id,
            fulfillment_mode,
            is_enabled,
            sla_category,
            version,
            updated_by,
            created_at,
            updated_at
        )
        SELECT
            v_zone_id,
            mode.fulfillment_mode,
            TRUE,
            'default',
            1,
            'seed:dsh-077-local-operational-policy',
            NOW(),
            NOW()
        FROM (
            VALUES
                ('bthwani_delivery'),
                ('partner_delivery'),
                ('client_pickup')
        ) AS mode(fulfillment_mode)
        ON CONFLICT (zone_id, fulfillment_mode) DO UPDATE
        SET is_enabled = EXCLUDED.is_enabled,
            sla_category = EXCLUDED.sla_category,
            updated_by = EXCLUDED.updated_by,
            version = dsh_platform_delivery_mode_policies.version + 1,
            updated_at = NOW()
        WHERE dsh_platform_delivery_mode_policies.is_enabled IS DISTINCT FROM EXCLUDED.is_enabled
           OR dsh_platform_delivery_mode_policies.sla_category IS DISTINCT FROM EXCLUDED.sla_category;
    END LOOP;
END;
$$;


-- ===========================================================================
-- Fixture block: dsh-958_partner_store_ownership.local.sql
-- ===========================================================================
-- Local-only correction for partner/legal-entity ownership.
--
-- The legacy local seed attached unrelated restaurant, bakery, pharmacy,
-- electronics and grocery stores to one legal partner. This seed restores the
-- sovereign Partner -> Brand -> Store relationship without changing public
-- store IDs used by runtime/e2e fixtures.

INSERT INTO dsh_partners (
    id, operator_context_id, legal_name_ar, legal_name_en, display_name,
    legal_identity_type, legal_identity_number, owner_name,
    primary_phone, secondary_phone, email, category,
    activation_status, created_by_actor_id, created_by_surface,
    notes, version, created_at, updated_at
) VALUES
    (
        'prt_partner_local_002', 'local-dsh', 'مؤسسة مخبز السبعين', 'Al Sabeen Bakery Est', 'مخبز السبعين',
        'commercial_register', 'YE-CR-LOCAL-BAKERY-002', 'محمد السبعيني',
        '+967771000102', '', 'bakery.partner@local.test', 'bakery',
        'client_visible', '@@FIELD_ACTOR_ID@@', 'app-field',
        'شريك محلي مستقل لمخبز السبعين', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_003', 'local-dsh', 'مؤسسة سوق شارع تعز', 'Taiz Street Market Est', 'سوق شارع تعز',
        'commercial_register', 'YE-CR-LOCAL-MARKET-003', 'علي التعزي',
        '+967771000103', '', 'taiz.market@local.test', 'grocery',
        'client_visible', '@@FIELD_ACTOR_ID@@', 'app-field',
        'شريك محلي مستقل لسوق شارع تعز', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_005', 'local-dsh', 'مؤسسة مطعم المدينة القديمة', 'Old City Restaurant Est', 'مطعم المدينة القديمة',
        'commercial_register', 'YE-CR-LOCAL-RESTAURANT-005', 'أحمد الصنعاني',
        '+967771000105', '', 'oldcity.restaurant@local.test', 'restaurant',
        'client_visible', '@@FIELD_ACTOR_ID@@', 'app-field',
        'شريك محلي مستقل لمطعم المدينة القديمة', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_006', 'local-dsh', 'مؤسسة صيدلية معين', 'Maeen Pharmacy Est', 'صيدلية معين',
        'commercial_register', 'YE-CR-LOCAL-PHARMACY-006', 'سامي معين',
        '+967771000106', '', 'maeen.pharmacy@local.test', 'pharmacy',
        'client_visible', '@@FIELD_ACTOR_ID@@', 'app-field',
        'شريك محلي مستقل لصيدلية معين', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_007', 'local-dsh', 'مؤسسة إلكترونيات المستقبل', 'Future Electronics Est', 'إلكترونيات المستقبل',
        'commercial_register', 'YE-CR-LOCAL-ELECTRONICS-007', 'خالد المستقبل',
        '+967771000107', '', 'future.electronics@local.test', 'default',
        'client_visible', '@@FIELD_ACTOR_ID@@', 'app-field',
        'شريك محلي مستقل لإلكترونيات المستقبل', 8, NOW() - INTERVAL '2 days', NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    operator_context_id = EXCLUDED.operator_context_id,
    legal_name_ar = EXCLUDED.legal_name_ar,
    legal_name_en = EXCLUDED.legal_name_en,
    display_name = EXCLUDED.display_name,
    legal_identity_type = EXCLUDED.legal_identity_type,
    legal_identity_number = EXCLUDED.legal_identity_number,
    owner_name = EXCLUDED.owner_name,
    primary_phone = EXCLUDED.primary_phone,
    email = EXCLUDED.email,
    category = EXCLUDED.category,
    activation_status = EXCLUDED.activation_status,
    notes = EXCLUDED.notes,
    updated_at = NOW();

UPDATE dsh_stores
SET partner_id = 'prt_partner_local_001',
    updated_at = NOW()
WHERE id = 'store-test-grocery'
  AND operator_context_id = 'local-dsh';

-- Partner replacement is opened only for this atomic seed transaction. The
-- deferred database constraint still requires an exact transfer-audit row for
-- every changed store and rejects the transaction if one is missing.
SELECT set_config('bthwani.governed_store_partner_transfer', 'on', true);

WITH transfer_plan(store_id, to_partner_id) AS (
    VALUES
        ('store-1002', 'prt_partner_local_002'),
        ('store-1003', 'prt_partner_local_003'),
        ('store-1005', 'prt_partner_local_005'),
        ('store-1006', 'prt_partner_local_006'),
        ('store-test-electronics', 'prt_partner_local_007')
), current_rows AS MATERIALIZED (
    SELECT
        store.operator_context_id,
        store.id AS store_id,
        store.partner_id AS from_partner_id,
        store.version AS expected_store_version,
        plan.to_partner_id
    FROM dsh_stores store
    JOIN transfer_plan plan ON plan.store_id = store.id
    WHERE store.operator_context_id = 'local-dsh'
      AND store.partner_id IS DISTINCT FROM plan.to_partner_id
    FOR UPDATE OF store
), updated AS (
    UPDATE dsh_stores store
    SET partner_id = current_rows.to_partner_id,
        partner_readiness = 'ready',
        catalog_approval_status = 'approved',
        marketing_visibility = 'visible',
        is_visible = true,
        version = current_rows.expected_store_version + 1,
        updated_at = NOW()
    FROM current_rows
    WHERE store.id = current_rows.store_id
      AND store.operator_context_id = current_rows.operator_context_id
      AND store.version = current_rows.expected_store_version
    RETURNING
        current_rows.operator_context_id,
        store.id AS store_id,
        current_rows.from_partner_id,
        current_rows.to_partner_id,
        current_rows.expected_store_version,
        store.version AS resulting_store_version
)
INSERT INTO dsh_partner_store_transfer_audit (
    operator_context_id, store_id, from_partner_id, to_partner_id,
    actor_id, actor_surface, reason,
    expected_store_version, resulting_store_version, correlation_id
)
SELECT
    operator_context_id,
    store_id,
    from_partner_id,
    to_partner_id,
    'system',
    'control-panel',
    'local governed ownership correction',
    expected_store_version,
    resulting_store_version,
    'seed:dsh-958:' || store_id
FROM updated;

SELECT set_config('bthwani.governed_store_partner_transfer', 'off', true);

-- Keep the canonical local partner actor scoped only to the legal entity/store
-- represented by its session. Runtime onboarding smoke creates a fresh transient
-- store on every run, so this reconciliation must remove every non-canonical local
-- scope rather than enumerating yesterday's generated store IDs. OperatorContext
-- ownership is derived through dsh_stores, matching the canonical scope table and
-- backend authorization queries.
DELETE FROM dsh_store_actor_scopes
WHERE actor_id = 'partner-local-001'
  AND actor_role = 'partner'
  AND operator_context_id = 'local-dsh'
  AND store_id <> 'store-test-grocery';

INSERT INTO dsh_store_actor_scopes (
    actor_id, actor_role, store_id, scope_type, active
) VALUES
    ('partner-local-001', 'partner', 'store-test-grocery', 'own', true),
    ('partner-local-002', 'partner', 'store-1002', 'own', true),
    ('partner-local-003', 'partner', 'store-1003', 'own', true),
    ('partner-local-005', 'partner', 'store-1005', 'own', true),
    ('partner-local-006', 'partner', 'store-1006', 'own', true),
    ('partner-local-007', 'partner', 'store-test-electronics', 'own', true)
ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE SET
    scope_type = EXCLUDED.scope_type,
    active = true;

-- The canonical field journey starts from the same governed grocery store as
-- the client/partner journey. Grant the provisioned field actor an explicit
-- store scope; field authorization is object-scoped and must not infer access
-- from partner ownership or service-area membership.
INSERT INTO dsh_store_actor_scopes (
    operator_context_id, actor_id, actor_role, store_id, scope_type, active
) VALUES
    ('local-dsh', '@@FIELD_ACTOR_ID@@', 'field', 'store-test-grocery', 'assigned', true)
ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE SET
    operator_context_id = EXCLUDED.operator_context_id,
    scope_type = EXCLUDED.scope_type,
    active = true;

-- Seed one approved legal document per independently visible local partner so
-- partner activation readiness is internally coherent rather than status-only.
INSERT INTO dsh_media_refs (
    media_ref, storage_key, owner_actor_id, owner_actor_role, partner_id,
    purpose, content_type, original_filename
) VALUES
    ('media_local_002_cr.jpg', 'local-seed/media_local_002_cr.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_002', 'partner_document', 'image/jpeg', 'media_local_002_cr.jpg'),
    ('media_local_003_cr.jpg', 'local-seed/media_local_003_cr.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_003', 'partner_document', 'image/jpeg', 'media_local_003_cr.jpg'),
    ('media_local_005_cr.jpg', 'local-seed/media_local_005_cr.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_005', 'partner_document', 'image/jpeg', 'media_local_005_cr.jpg'),
    ('media_local_006_cr.jpg', 'local-seed/media_local_006_cr.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_006', 'partner_document', 'image/jpeg', 'media_local_006_cr.jpg'),
    ('media_local_007_cr.jpg', 'local-seed/media_local_007_cr.jpg', '@@FIELD_ACTOR_ID@@', 'field', 'prt_partner_local_007', 'partner_document', 'image/jpeg', 'media_local_007_cr.jpg')
ON CONFLICT (media_ref) DO NOTHING;

INSERT INTO dsh_partner_documents (
    id, partner_id, document_type, document_status, upload_status, review_status,
    uploaded_by_actor_id, media_ref, notes, reviewed_by_actor_id, reviewed_at,
    last_review_reason, version, created_at, updated_at
) VALUES
    ('doc_local_002_cr', 'prt_partner_local_002', 'commercial_register', 'approved', 'uploaded', 'verified', '@@FIELD_ACTOR_ID@@', 'media_local_002_cr.jpg', 'سجل تجاري محلي معتمد', 'operator-local-001', NOW() - INTERVAL '1 day', 'مستند محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_003_cr', 'prt_partner_local_003', 'commercial_register', 'approved', 'uploaded', 'verified', '@@FIELD_ACTOR_ID@@', 'media_local_003_cr.jpg', 'سجل تجاري محلي معتمد', 'operator-local-001', NOW() - INTERVAL '1 day', 'مستند محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_005_cr', 'prt_partner_local_005', 'commercial_register', 'approved', 'uploaded', 'verified', '@@FIELD_ACTOR_ID@@', 'media_local_005_cr.jpg', 'سجل تجاري محلي معتمد', 'operator-local-001', NOW() - INTERVAL '1 day', 'مستند محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_006_cr', 'prt_partner_local_006', 'commercial_register', 'approved', 'uploaded', 'verified', '@@FIELD_ACTOR_ID@@', 'media_local_006_cr.jpg', 'سجل تجاري محلي معتمد', 'operator-local-001', NOW() - INTERVAL '1 day', 'مستند محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_007_cr', 'prt_partner_local_007', 'commercial_register', 'approved', 'uploaded', 'verified', '@@FIELD_ACTOR_ID@@', 'media_local_007_cr.jpg', 'سجل تجاري محلي معتمد', 'operator-local-001', NOW() - INTERVAL '1 day', 'مستند محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO UPDATE SET
    document_status = 'approved',
    upload_status = 'uploaded',
    review_status = 'verified',
    notes = EXCLUDED.notes,
    reviewed_by_actor_id = EXCLUDED.reviewed_by_actor_id,
    reviewed_at = EXCLUDED.reviewed_at,
    last_review_reason = EXCLUDED.last_review_reason,
    updated_at = NOW();

INSERT INTO dsh_partner_activation_events (
    id, partner_id, from_status, to_status, actor_id, actor_surface,
    reason, correlation_id, idempotency_key, created_at
) VALUES
    ('pae_local_002_visible', 'prt_partner_local_002', 'partner_active', 'client_visible', 'system', 'system', 'local governed ownership correction', 'seed:dsh-958:002', 'seed:dsh-958:002', NOW()),
    ('pae_local_003_visible', 'prt_partner_local_003', 'partner_active', 'client_visible', 'system', 'system', 'local governed ownership correction', 'seed:dsh-958:003', 'seed:dsh-958:003', NOW()),
    ('pae_local_005_visible', 'prt_partner_local_005', 'partner_active', 'client_visible', 'system', 'system', 'local governed ownership correction', 'seed:dsh-958:005', 'seed:dsh-958:005', NOW()),
    ('pae_local_006_visible', 'prt_partner_local_006', 'partner_active', 'client_visible', 'system', 'system', 'local governed ownership correction', 'seed:dsh-958:006', 'seed:dsh-958:006', NOW()),
    ('pae_local_007_visible', 'prt_partner_local_007', 'partner_active', 'client_visible', 'system', 'system', 'local governed ownership correction', 'seed:dsh-958:007', 'seed:dsh-958:007', NOW())
ON CONFLICT (id) DO NOTHING;


-- ===========================================================================
-- Fixture block: dsh-960_client_storefront_catalog_completion.local.sql
-- ===========================================================================
-- Local-only catalog completion for every store intentionally published to the
-- app-client. Public discovery is fail-closed when no approved assortment can be
-- rendered, so these fixtures carry catalog truth only. Local media is
-- strictly optional and relies on real user uploads rather than static seeds.

INSERT INTO dsh_store_catalog_domains (store_id, domain_id, status)
VALUES
  ('store-1003', 'domain-groceries', 'approved'),
  ('store-1006', 'domain-pharmacy', 'approved'),
  ('store-test-electronics', 'domain-electronics', 'approved')
ON CONFLICT (store_id, domain_id) DO UPDATE SET
  status = 'approved',
  updated_at = NOW();

INSERT INTO dsh_master_products
  (id, domain_id, category_node_id, canonical_name_ar, canonical_name_en,
   brand, sku, unit, measurement_type, approval_status, is_active,
   created_source)
VALUES
  ('product-1006-pain-relief', 'domain-pharmacy', 'node-pain-relief',
   'بنادول إكسترا مسكن سريع للألم 24 قرص', 'Panadol Extra Fast Pain Relief 24 Tablets', 'Panadol', 'PANADOL-EXTRA-24',
   'pack', 'unit', 'approved', TRUE, 'client-storefront-seed'),
  ('product-electronics-android-phone', 'domain-electronics', 'node-android-phones',
   'هاتف أندرويد ذكي 128GB شاشة AMOLED', 'Android Smartphone 128GB AMOLED 120Hz', 'سامسونج',
   'SAMSUNG-A54-128GB', 'piece', 'unit', 'approved', TRUE,
   'client-storefront-seed')
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
  ('assortment-store-1003-rice', 'store-1003', 'product-1001-rice',
   'متاح في فرع شارع تعز',
   'client_visible', 'system-seed', 'system-seed'),
  ('assortment-store-1006-pain-relief', 'store-1006', 'product-1006-pain-relief',
   'عبوة دوائية تجريبية محلية',
   'client_visible', 'system-seed', 'system-seed'),
  ('assortment-store-electronics-phone', 'store-test-electronics',
   'product-electronics-android-phone', 'هاتف ذكي متاح للعرض المحلي',
   'client_visible', 'system-seed',
   'system-seed')
ON CONFLICT (store_id, master_product_id) DO UPDATE SET
  local_note = EXCLUDED.local_note,
  publication_status = 'client_visible',
  submitted_by = EXCLUDED.submitted_by,
  approved_by = EXCLUDED.approved_by,
  updated_at = NOW();


-- ===========================================================================
-- Fixture block: dsh-960_home_discovery_marketing.local.sql
-- ===========================================================================
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


-- ===========================================================================
-- Fixture block: dsh-961_public_store_readiness.local.sql
-- ===========================================================================
-- Local-only convergence for the complete public-store publication predicate.
--
-- Earlier fixtures provided identity, governance, and catalog truth but
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
      WHEN status = 'published' THEN 'ready'
      ELSE 'paused'
    END,
    partner_readiness = 'ready',
    catalog_approval_status = 'approved',
    marketing_visibility = 'visible',
    updated_at = NOW()
WHERE operator_context_id = 'local-dsh'
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
    updated_at = NOW()
WHERE operator_context_id = 'local-dsh'
  AND status = 'published'
  AND is_visible = true
  AND partner_readiness = 'ready'
  AND catalog_approval_status = 'approved'
  AND marketing_visibility = 'visible';


-- ===========================================================================
-- Fixture block: dsh-981_assortment_runtime_truth.local.sql
-- ===========================================================================
-- Local-only convergence of seeded assortments onto the normalized runtime
-- inventory and price authorities. This file is intentionally independent of
-- the metadata link: no commercial field is written to dsh_store_assortments.

INSERT INTO dsh_store_assortment_inventory (
  store_assortment_id,
  policy_type,
  quantity,
  reserved_quantity,
  min_order_quantity,
  max_order_quantity,
  step_quantity,
  version,
  created_at,
  updated_at
)
VALUES
  ('assortment-store-test-grocery-rice', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1005-meal', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1002-croissant', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1002-wheatbread', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-test-grocery-milk', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-test-grocery-apple', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1003-rice', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1006-pain-relief', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-electronics-phone', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW())
ON CONFLICT (store_assortment_id) DO UPDATE SET
  policy_type = EXCLUDED.policy_type,
  quantity = EXCLUDED.quantity,
  reserved_quantity = EXCLUDED.reserved_quantity,
  min_order_quantity = EXCLUDED.min_order_quantity,
  max_order_quantity = EXCLUDED.max_order_quantity,
  step_quantity = EXCLUDED.step_quantity,
  version = CASE
    WHEN dsh_store_assortment_inventory.policy_type IS DISTINCT FROM EXCLUDED.policy_type
      OR dsh_store_assortment_inventory.quantity IS DISTINCT FROM EXCLUDED.quantity
      OR dsh_store_assortment_inventory.reserved_quantity IS DISTINCT FROM EXCLUDED.reserved_quantity
      OR dsh_store_assortment_inventory.min_order_quantity IS DISTINCT FROM EXCLUDED.min_order_quantity
      OR dsh_store_assortment_inventory.max_order_quantity IS DISTINCT FROM EXCLUDED.max_order_quantity
      OR dsh_store_assortment_inventory.step_quantity IS DISTINCT FROM EXCLUDED.step_quantity
    THEN dsh_store_assortment_inventory.version + 1
    ELSE dsh_store_assortment_inventory.version
  END,
  updated_at = CASE
    WHEN dsh_store_assortment_inventory.policy_type IS DISTINCT FROM EXCLUDED.policy_type
      OR dsh_store_assortment_inventory.quantity IS DISTINCT FROM EXCLUDED.quantity
      OR dsh_store_assortment_inventory.reserved_quantity IS DISTINCT FROM EXCLUDED.reserved_quantity
      OR dsh_store_assortment_inventory.min_order_quantity IS DISTINCT FROM EXCLUDED.min_order_quantity
      OR dsh_store_assortment_inventory.max_order_quantity IS DISTINCT FROM EXCLUDED.max_order_quantity
      OR dsh_store_assortment_inventory.step_quantity IS DISTINCT FROM EXCLUDED.step_quantity
    THEN NOW()
    ELSE dsh_store_assortment_inventory.updated_at
  END;

DELETE FROM dsh_store_assortment_prices
WHERE id IN (
  'price-assortment-store-test-grocery-rice',
  'price-assortment-store-1005-meal',
  'price-assortment-store-1002-croissant',
  'price-assortment-store-1002-wheatbread',
  'price-assortment-store-test-grocery-milk',
  'price-assortment-store-test-grocery-apple',
  'price-assortment-store-1003-rice',
  'price-assortment-store-1006-pain-relief',
  'price-assortment-store-electronics-phone',
  'local-price-assortment-store-test-grocery-rice',
  'local-price-assortment-store-1005-meal',
  'local-price-assortment-store-1002-croissant',
  'local-price-assortment-store-1002-wheatbread',
  'local-price-assortment-store-test-grocery-milk',
  'local-price-assortment-store-test-grocery-apple',
  'local-price-assortment-store-1003-rice',
  'local-price-assortment-store-1006-pain-relief',
  'local-price-assortment-store-electronics-phone'
);

INSERT INTO dsh_store_assortment_prices (
  id,
  store_assortment_id,
  amount_minor,
  currency,
  prep_time_min,
  prep_time_max,
  effective_from,
  effective_until,
  version,
  created_at,
  updated_at
)
VALUES
  ('local-price-assortment-store-test-grocery-rice', 'assortment-store-test-grocery-rice', 1800000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1005-meal', 'assortment-store-1005-meal', 180000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1002-croissant', 'assortment-store-1002-croissant', 50000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1002-wheatbread', 'assortment-store-1002-wheatbread', 30000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-test-grocery-milk', 'assortment-store-test-grocery-milk', 110000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-test-grocery-apple', 'assortment-store-test-grocery-apple', 180000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1003-rice', 'assortment-store-1003-rice', 1820000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1006-pain-relief', 'assortment-store-1006-pain-relief', 150000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-electronics-phone', 'assortment-store-electronics-phone', 12500000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  amount_minor = EXCLUDED.amount_minor,
  currency = EXCLUDED.currency,
  prep_time_min = EXCLUDED.prep_time_min,
  prep_time_max = EXCLUDED.prep_time_max,
  effective_from = EXCLUDED.effective_from,
  effective_until = EXCLUDED.effective_until,
  version = dsh_store_assortment_prices.version + 1,
  updated_at = NOW();

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM dsh_store_assortment_inventory i
  WHERE i.store_assortment_id IN (
      'assortment-store-test-grocery-rice',
      'assortment-store-1005-meal',
      'assortment-store-1002-croissant',
      'assortment-store-1002-wheatbread',
      'assortment-store-test-grocery-milk',
      'assortment-store-test-grocery-apple',
      'assortment-store-1003-rice',
      'assortment-store-1006-pain-relief',
      'assortment-store-electronics-phone'
    )
    AND (
      i.policy_type NOT IN ('signal', 'quantity', 'infinite')
      OR i.quantity < 0
      OR i.reserved_quantity < 0
      OR i.reserved_quantity > i.quantity
      OR i.min_order_quantity < 1
      OR i.max_order_quantity < i.min_order_quantity
      OR i.step_quantity < 1
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'DSH_LOCAL_NORMALIZED_INVENTORY_INVALID: % seeded rows failed validation', invalid_count;
  END IF;

  SELECT COUNT(*)
  INTO invalid_count
  FROM (
    VALUES
      ('assortment-store-test-grocery-rice', 1800000),
      ('assortment-store-1005-meal', 180000),
      ('assortment-store-1002-croissant', 50000),
      ('assortment-store-1002-wheatbread', 30000),
      ('assortment-store-test-grocery-milk', 110000),
      ('assortment-store-test-grocery-apple', 180000),
      ('assortment-store-1003-rice', 1820000),
      ('assortment-store-1006-pain-relief', 150000),
      ('assortment-store-electronics-phone', 12500000)
  ) AS expected(store_assortment_id, amount_minor)
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_prices p
    WHERE p.store_assortment_id = expected.store_assortment_id
      AND p.amount_minor = expected.amount_minor
      AND p.currency = 'YER'
      AND p.effective_from IS NOT NULL
  );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'DSH_LOCAL_NORMALIZED_PRICE_INVALID: % seeded rows failed validation', invalid_count;
  END IF;
END;
$$;


