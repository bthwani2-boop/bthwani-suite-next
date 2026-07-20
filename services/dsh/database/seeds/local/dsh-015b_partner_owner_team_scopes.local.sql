-- Partner runtime owner membership closure.
--
-- dsh_store_actor_scopes proves coarse store access, while /dsh/partner/scopes
-- deliberately derives fine-grained permissions from active team membership.
-- Seed an explicit owner row for every store linked to the local partner so the
-- runtime never grants owner permissions implicitly when membership is absent.

INSERT INTO dsh_store_team_members (
    id,
    store_id,
    name,
    role,
    status,
    branch_assignment,
    permissions_summary,
    delivery_assignment,
    invite_lifecycle,
    operational_impact,
    audit_note,
    invited_identity,
    invited_by_actor_id,
    identity_actor_id,
    version
)
SELECT
    'stm_partner_local_owner_' || replace(s.id, '-', '_'),
    s.id,
    'عبدالله محمد الحداد',
    'owner',
    'active',
    s.display_name,
    'إدارة كاملة للفرع ضمن حدود الشريك والحوكمة المركزية',
    '',
    'مالك محلي مرتبط بهوية الشريك التشغيلية',
    'إدارة الفريق والإعدادات والكتالوج والتشغيل للفرع',
    'seed:dsh-015b explicit owner membership',
    '+967771000001',
    'system',
    'partner-local-001',
    1
FROM dsh_stores s
WHERE s.partner_id = 'prt_partner_local_001'
ON CONFLICT (id) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    branch_assignment = EXCLUDED.branch_assignment,
    permissions_summary = EXCLUDED.permissions_summary,
    delivery_assignment = EXCLUDED.delivery_assignment,
    invite_lifecycle = EXCLUDED.invite_lifecycle,
    operational_impact = EXCLUDED.operational_impact,
    audit_note = EXCLUDED.audit_note,
    invited_identity = EXCLUDED.invited_identity,
    invited_by_actor_id = EXCLUDED.invited_by_actor_id,
    identity_actor_id = EXCLUDED.identity_actor_id,
    version = EXCLUDED.version,
    updated_at = NOW();
