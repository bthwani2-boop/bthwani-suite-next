-- DSH-015: Partner Onboarding and Store Activation local seed

INSERT INTO dsh_partners (
    id,
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
    'مؤسسة أسواق حدة المركزية',
    'Haddah Central Market Est',
    'أسواق حدة المركزية',
    'commercial_register',
    'CR9900112233',
    'شريك محلي أول',
    '+966500000001',
    '+966500000002',
    'partner1@local.com',
    'grocery',
    'client_visible',
    'field-local-001',
    'app-field',
    'ملف تأهيل شريك تجريبي محلي',
    1,
    now() - interval '2 days',
    now() - interval '2 days'
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
    updated_at = now();

-- Link store-1001 to the seed partner
UPDATE dsh_stores SET partner_id = 'prt_partner_local_001' WHERE id = 'store-1001';

-- Insert seed documents
INSERT INTO dsh_partner_documents (
    id,
    partner_id,
    document_type,
    document_status,
    uploaded_by_actor_id,
    media_ref,
    notes,
    rejection_reason,
    version,
    created_at,
    updated_at
) VALUES 
(
    'doc_cr_001',
    'prt_partner_local_001',
    'commercial_register',
    'approved',
    'field-local-001',
    'media_cr_990011.jpg',
    'السجل التجاري الأصلي',
    '',
    1,
    now() - interval '2 days',
    now() - interval '2 days'
),
(
    'doc_nid_001',
    'prt_partner_local_001',
    'national_id',
    'approved',
    'field-local-001',
    'media_id_partner1.jpg',
    'بطاقة الهوية الوطنية للمالك',
    '',
    1,
    now() - interval '2 days',
    now() - interval '2 days'
) ON CONFLICT (id) DO UPDATE SET
    document_status = EXCLUDED.document_status,
    updated_at = now();

-- Insert seed document reviews
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
) ON CONFLICT (id) DO NOTHING;

-- Insert seed field visit
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
    'store-1001',
    'field-local-001',
    'submitted',
    'تمت الزيارة الميدانية الأولى والتأكد من مطابقة اللوحة وعنوان الشارع',
    24.7135820,
    46.6752930,
    ARRAY['media_visit_front_001.jpg', 'media_visit_inside_001.jpg']::TEXT[],
    1,
    now() - interval '2 days',
    now() - interval '1 day'
) ON CONFLICT (id) DO UPDATE SET
    visit_status = EXCLUDED.visit_status,
    visit_notes = EXCLUDED.visit_notes,
    submitted_at = now() - interval '1 day';

-- Insert seed activation transition events
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
    'field-local-001',
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
    'documents_verified',
    'operator-local-001',
    'control-panel',
    'اعتماد جميع الوثائق المرفوعة في النظام',
    'corr_seed_dsh_015',
    'idem_seed_002',
    now() - interval '1 day'
),
(
    'pae_003',
    'prt_partner_local_001',
    'documents_verified',
    'partner_active',
    'operator-local-001',
    'control-panel',
    'تفعيل الشريك تجارياً وتأكيد جاهزيته',
    'corr_seed_dsh_015',
    'idem_seed_003',
    now() - interval '1 day'
),
(
    'pae_004',
    'prt_partner_local_001',
    'partner_active',
    'client_visible',
    'system',
    'system',
    'استيفاء جميع شروط الظهور والجاهزية الكتالوجية للعميل',
    'corr_seed_dsh_015',
    'idem_seed_004',
    now() - interval '12 hours'
) ON CONFLICT (id) DO NOTHING;
