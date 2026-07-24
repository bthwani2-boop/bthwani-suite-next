-- Local-only correction for partner/legal-entity ownership.
--
-- The legacy local seed attached unrelated restaurant, bakery, pharmacy,
-- electronics and grocery stores to one legal partner. This seed restores the
-- sovereign Partner -> Brand -> Store relationship without changing public
-- store IDs used by runtime/e2e fixtures.

INSERT INTO dsh_partners (
    id, tenant_id, legal_name_ar, legal_name_en, display_name,
    legal_identity_type, legal_identity_number, owner_name,
    primary_phone, secondary_phone, email, category,
    activation_status, created_by_actor_id, created_by_surface,
    notes, version, created_at, updated_at
) VALUES
    (
        'prt_partner_local_002', 'local-dsh', 'مؤسسة مخبز السبعين', 'Al Sabeen Bakery Est', 'مخبز السبعين',
        'commercial_register', 'YE-CR-LOCAL-BAKERY-002', 'محمد السبعيني',
        '+967771000102', '', 'bakery.partner@local.test', 'bakery',
        'client_visible', 'field-local-001', 'app-field',
        'شريك محلي مستقل لمخبز السبعين', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_003', 'local-dsh', 'مؤسسة سوق شارع تعز', 'Taiz Street Market Est', 'سوق شارع تعز',
        'commercial_register', 'YE-CR-LOCAL-MARKET-003', 'علي التعزي',
        '+967771000103', '', 'taiz.market@local.test', 'grocery',
        'client_visible', 'field-local-001', 'app-field',
        'شريك محلي مستقل لسوق شارع تعز', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_005', 'local-dsh', 'مؤسسة مطعم المدينة القديمة', 'Old City Restaurant Est', 'مطعم المدينة القديمة',
        'commercial_register', 'YE-CR-LOCAL-RESTAURANT-005', 'أحمد الصنعاني',
        '+967771000105', '', 'oldcity.restaurant@local.test', 'restaurant',
        'client_visible', 'field-local-001', 'app-field',
        'شريك محلي مستقل لمطعم المدينة القديمة', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_006', 'local-dsh', 'مؤسسة صيدلية معين', 'Maeen Pharmacy Est', 'صيدلية معين',
        'commercial_register', 'YE-CR-LOCAL-PHARMACY-006', 'سامي معين',
        '+967771000106', '', 'maeen.pharmacy@local.test', 'pharmacy',
        'client_visible', 'field-local-001', 'app-field',
        'شريك محلي مستقل لصيدلية معين', 8, NOW() - INTERVAL '2 days', NOW()
    ),
    (
        'prt_partner_local_007', 'local-dsh', 'مؤسسة إلكترونيات المستقبل', 'Future Electronics Est', 'إلكترونيات المستقبل',
        'commercial_register', 'YE-CR-LOCAL-ELECTRONICS-007', 'خالد المستقبل',
        '+967771000107', '', 'future.electronics@local.test', 'default',
        'client_visible', 'field-local-001', 'app-field',
        'شريك محلي مستقل لإلكترونيات المستقبل', 8, NOW() - INTERVAL '2 days', NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
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

INSERT INTO dsh_partner_brands (
    id, tenant_id, partner_id, name_ar, name_en, category, status
) VALUES
    ('pbr_local_haddah',      'local-dsh', 'prt_partner_local_001', 'أسواق حدة المركزية', 'Haddah Central Market', 'grocery', 'active'),
    ('pbr_local_sabeen',      'local-dsh', 'prt_partner_local_002', 'مخبز السبعين', 'Al Sabeen Bakery', 'bakery', 'active'),
    ('pbr_local_taiz_market', 'local-dsh', 'prt_partner_local_003', 'سوق شارع تعز', 'Taiz Street Market', 'grocery', 'active'),
    ('pbr_local_old_city',    'local-dsh', 'prt_partner_local_005', 'مطعم المدينة القديمة', 'Old City Restaurant', 'restaurant', 'active'),
    ('pbr_local_maeen',       'local-dsh', 'prt_partner_local_006', 'صيدلية معين', 'Maeen Pharmacy', 'pharmacy', 'active'),
    ('pbr_local_electronics', 'local-dsh', 'prt_partner_local_007', 'إلكترونيات المستقبل', 'Future Electronics', 'electronics', 'active')
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    partner_id = EXCLUDED.partner_id,
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    category = EXCLUDED.category,
    status = EXCLUDED.status,
    version = dsh_partner_brands.version + 1,
    updated_at = NOW();

UPDATE dsh_stores SET partner_id = 'prt_partner_local_001', brand_id = 'pbr_local_haddah',      updated_at = NOW() WHERE id = 'store-test-grocery' AND tenant_id = 'local-dsh';
UPDATE dsh_stores SET partner_id = 'prt_partner_local_002', brand_id = 'pbr_local_sabeen',      updated_at = NOW() WHERE id = 'store-1002' AND tenant_id = 'local-dsh';
UPDATE dsh_stores SET partner_id = 'prt_partner_local_003', brand_id = 'pbr_local_taiz_market', updated_at = NOW() WHERE id = 'store-1003' AND tenant_id = 'local-dsh';
UPDATE dsh_stores SET partner_id = 'prt_partner_local_005', brand_id = 'pbr_local_old_city',    updated_at = NOW() WHERE id = 'store-1005' AND tenant_id = 'local-dsh';
UPDATE dsh_stores SET partner_id = 'prt_partner_local_006', brand_id = 'pbr_local_maeen',       updated_at = NOW() WHERE id = 'store-1006' AND tenant_id = 'local-dsh';
UPDATE dsh_stores SET partner_id = 'prt_partner_local_007', brand_id = 'pbr_local_electronics', updated_at = NOW() WHERE id = 'store-test-electronics' AND tenant_id = 'local-dsh';

-- Keep the canonical local partner actor scoped only to the legal entity/store
-- represented by its session. Other fixture actors are isolated by store.
DELETE FROM dsh_store_actor_scopes
WHERE tenant_id = 'local-dsh'
  AND actor_id = 'partner-local-001'
  AND actor_role = 'partner'
  AND store_id IN ('store-1002', 'store-1003', 'store-1005', 'store-1006', 'store-test-electronics');

INSERT INTO dsh_store_actor_scopes (
    tenant_id, actor_id, actor_role, store_id, scope_type, active
) VALUES
    ('local-dsh', 'partner-local-001', 'partner', 'store-test-grocery', 'owner', true),
    ('local-dsh', 'partner-local-002', 'partner', 'store-1002', 'owner', true),
    ('local-dsh', 'partner-local-003', 'partner', 'store-1003', 'owner', true),
    ('local-dsh', 'partner-local-005', 'partner', 'store-1005', 'owner', true),
    ('local-dsh', 'partner-local-006', 'partner', 'store-1006', 'owner', true),
    ('local-dsh', 'partner-local-007', 'partner', 'store-test-electronics', 'owner', true)
ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    scope_type = EXCLUDED.scope_type,
    active = true;

-- Seed one approved legal document per independently visible local partner so
-- partner activation readiness is internally coherent rather than status-only.
INSERT INTO dsh_partner_documents (
    id, partner_id, document_type, document_status,
    uploaded_by_actor_id, media_ref, notes, version, created_at, updated_at
) VALUES
    ('doc_local_002_cr', 'prt_partner_local_002', 'commercial_register', 'approved', 'field-local-001', 'media_local_002_cr.jpg', 'سجل تجاري محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_003_cr', 'prt_partner_local_003', 'commercial_register', 'approved', 'field-local-001', 'media_local_003_cr.jpg', 'سجل تجاري محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_005_cr', 'prt_partner_local_005', 'commercial_register', 'approved', 'field-local-001', 'media_local_005_cr.jpg', 'سجل تجاري محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_006_cr', 'prt_partner_local_006', 'commercial_register', 'approved', 'field-local-001', 'media_local_006_cr.jpg', 'سجل تجاري محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW()),
    ('doc_local_007_cr', 'prt_partner_local_007', 'commercial_register', 'approved', 'field-local-001', 'media_local_007_cr.jpg', 'سجل تجاري محلي معتمد', 2, NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO UPDATE SET
    document_status = 'approved',
    notes = EXCLUDED.notes,
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
