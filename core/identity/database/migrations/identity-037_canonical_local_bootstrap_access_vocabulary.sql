-- identity-037: canonicalize every Role/Permission vocabulary entry consumed
-- by Identity local bootstrap and administrative access policies.
--
-- Vocabulary is migration-owned. Runtime bootstrap may create local actors and
-- bind existing authority, but must never invent Role or Permission truth.

INSERT INTO identity_roles(name, description)
VALUES
    ('client', 'Standard consumer client'),
    ('partner', 'Store partner'),
    ('field', 'Field workforce provider'),
    ('captain', 'Delivery captain'),
    ('operator', 'Platform operator authentication role'),
    ('employee', 'Administrative workforce employee'),
    ('workforce.supervise.employee', 'Employee supervision authority role'),
    ('workforce.supervise.field', 'Field workforce supervision authority role'),
    ('workforce.supervise.captain', 'Captain workforce supervision authority role'),
    ('platform-approver', 'Local platform variable approver'),
    ('platform-applier', 'Local platform variable applier'),
    ('platform-rollout-manager', 'Local platform rollout manager')
ON CONFLICT (name) DO NOTHING;

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'platform:read', 'Canonical capability consumed by Identity access policy: platform:read'),
    ('dsh', 'control-panel', 'platform:health:read', 'Canonical capability consumed by Identity access policy: platform:health:read'),
    ('dsh', 'control-panel', 'platform:audit:read', 'Canonical capability consumed by Identity access policy: platform:audit:read'),
    ('dsh', 'control-panel', 'platform:variables:approve', 'Canonical capability consumed by Identity access policy: platform:variables:approve'),
    ('dsh', 'control-panel', 'platform:variables:apply', 'Canonical capability consumed by Identity access policy: platform:variables:apply'),
    ('dsh', 'control-panel', 'platform:variables:rollback', 'Canonical capability consumed by Identity access policy: platform:variables:rollback'),
    ('dsh', 'control-panel', 'platform:rollouts:manage', 'Canonical capability consumed by Identity access policy: platform:rollouts:manage'),
    ('dsh', 'control-panel', 'store:read', 'Canonical capability consumed by Identity access policy: store:read'),
    ('dsh', 'control-panel', 'store:write', 'Canonical capability consumed by Identity access policy: store:write'),
    ('dsh', 'control-panel', 'partners.read', 'Canonical capability consumed by Identity access policy: partners.read'),
    ('dsh', 'control-panel', 'partners.manage', 'Canonical capability consumed by Identity access policy: partners.manage'),
    ('dsh', 'control-panel', 'partners.activate', 'Canonical capability consumed by Identity access policy: partners.activate'),
    ('dsh', 'control-panel', 'finance.read', 'Canonical capability consumed by Identity access policy: finance.read'),
    ('dsh', 'control-panel', 'finance.manage', 'Canonical capability consumed by Identity access policy: finance.manage'),
    ('dsh', 'control-panel', 'dsh.dispatch_financial_eligibility.read', 'Canonical capability consumed by Identity access policy: dsh.dispatch_financial_eligibility.read'),
    ('dsh', 'control-panel', 'dsh.dispatch_financial_eligibility.manage', 'Canonical capability consumed by Identity access policy: dsh.dispatch_financial_eligibility.manage'),
    ('dsh', 'control-panel', 'operations.read', 'Canonical capability consumed by Identity access policy: operations.read'),
    ('dsh', 'control-panel', 'operations.manage', 'Canonical capability consumed by Identity access policy: operations.manage'),
    ('dsh', 'control-panel', 'operations.special_requests.read', 'Canonical capability consumed by Identity access policy: operations.special_requests.read'),
    ('dsh', 'control-panel', 'operations.special_requests.transition', 'Canonical capability consumed by Identity access policy: operations.special_requests.transition'),
    ('dsh', 'control-panel', 'operations.special_requests.dispatch', 'Canonical capability consumed by Identity access policy: operations.special_requests.dispatch'),
    ('dsh', 'control-panel', 'marketing.read', 'Canonical capability consumed by Identity access policy: marketing.read'),
    ('dsh', 'control-panel', 'marketing.manage', 'Canonical capability consumed by Identity access policy: marketing.manage'),
    ('dsh', 'control-panel', 'support.read', 'Canonical capability consumed by Identity access policy: support.read'),
    ('dsh', 'control-panel', 'support.manage', 'Canonical capability consumed by Identity access policy: support.manage'),
    ('dsh', 'control-panel', 'dsh.service_zones.read', 'Canonical capability consumed by Identity access policy: dsh.service_zones.read'),
    ('dsh', 'control-panel', 'dsh.service_zones.manage', 'Canonical capability consumed by Identity access policy: dsh.service_zones.manage'),
    ('dsh', 'control-panel', 'dsh.catalog.categories.read', 'Canonical capability consumed by Identity access policy: dsh.catalog.categories.read'),
    ('dsh', 'control-panel', 'dsh.catalog.categories.manage', 'Canonical capability consumed by Identity access policy: dsh.catalog.categories.manage'),
    ('dsh', 'control-panel', 'dsh.catalog.products.read', 'Canonical capability consumed by Identity access policy: dsh.catalog.products.read'),
    ('dsh', 'control-panel', 'dsh.catalog.products.manage', 'Canonical capability consumed by Identity access policy: dsh.catalog.products.manage'),
    ('dsh', 'control-panel', 'dsh.catalog.stores.read', 'Canonical capability consumed by Identity access policy: dsh.catalog.stores.read'),
    ('dsh', 'control-panel', 'dsh.catalog.stores.manage', 'Canonical capability consumed by Identity access policy: dsh.catalog.stores.manage'),
    ('dsh', 'control-panel', 'dsh.catalog.banners.read', 'Canonical capability consumed by Identity access policy: dsh.catalog.banners.read'),
    ('dsh', 'control-panel', 'dsh.catalog.banners.manage', 'Canonical capability consumed by Identity access policy: dsh.catalog.banners.manage'),
    ('dsh', 'control-panel', 'dsh.catalog.discounts.read', 'Canonical capability consumed by Identity access policy: dsh.catalog.discounts.read'),
    ('dsh', 'control-panel', 'dsh.catalog.discounts.manage', 'Canonical capability consumed by Identity access policy: dsh.catalog.discounts.manage'),
    ('dsh', 'control-panel', 'catalog.proposal.review', 'Canonical capability consumed by Identity access policy: catalog.proposal.review'),
    ('dsh', 'control-panel', 'catalog.proposal.marketing_review', 'Canonical capability consumed by Identity access policy: catalog.proposal.marketing_review'),
    ('dsh', 'control-panel', 'catalog.proposal.adopt', 'Canonical capability consumed by Identity access policy: catalog.proposal.adopt'),
    ('dsh', 'control-panel', 'catalog.proposal.publish', 'Canonical capability consumed by Identity access policy: catalog.proposal.publish'),
    ('dsh', 'control-panel', 'catalog.media.manage', 'Canonical capability consumed by Identity access policy: catalog.media.manage'),
    ('dsh', 'control-panel', 'catalog.assortment.read', 'Canonical capability consumed by Identity access policy: catalog.assortment.read'),
    ('dsh', 'control-panel', 'catalog.assortment.manage', 'Canonical capability consumed by Identity access policy: catalog.assortment.manage'),
    ('workforce', 'control-panel', 'provider:read', 'Canonical capability consumed by Identity access policy: provider:read'),
    ('workforce', 'control-panel', 'provider:create', 'Canonical capability consumed by Identity access policy: provider:create'),
    ('workforce', 'control-panel', 'provider:update', 'Canonical capability consumed by Identity access policy: provider:update'),
    ('workforce', 'control-panel', 'provider:suspend', 'Canonical capability consumed by Identity access policy: provider:suspend'),
    ('workforce', 'control-panel', 'provider:reactivate', 'Canonical capability consumed by Identity access policy: provider:reactivate'),
    ('workforce', 'control-panel', 'provider.activation:issue', 'Canonical capability consumed by Identity access policy: provider.activation:issue'),
    ('workforce', 'control-panel', 'reference:manage', 'Canonical capability consumed by Identity access policy: reference:manage'),
    ('workforce', 'control-panel', 'audit:read', 'Canonical capability consumed by Identity access policy: audit:read'),
    ('dsh', 'control-panel', 'platform.manage', 'Canonical capability consumed by Identity access policy: platform.manage'),
    ('dsh', 'control-panel', 'dsh.fulfillment_sla.read', 'Canonical capability consumed by Identity access policy: dsh.fulfillment_sla.read'),
    ('dsh', 'control-panel', 'dsh.fulfillment_sla.manage', 'Canonical capability consumed by Identity access policy: dsh.fulfillment_sla.manage'),
    ('dsh', 'control-panel', 'dsh.dispatch_capacity.read', 'Canonical capability consumed by Identity access policy: dsh.dispatch_capacity.read'),
    ('dsh', 'control-panel', 'dsh.dispatch_capacity.manage', 'Canonical capability consumed by Identity access policy: dsh.dispatch_capacity.manage'),
    ('dsh', 'control-panel', 'dsh.operational_policy.audit.read', 'Canonical capability consumed by Identity access policy: dsh.operational_policy.audit.read'),
    ('dsh', 'control-panel', 'dsh.operational_policy.evaluate', 'Canonical capability consumed by Identity access policy: dsh.operational_policy.evaluate'),
    ('dsh', 'control-panel', 'dsh.operational_policy.rollback', 'Canonical capability consumed by Identity access policy: dsh.operational_policy.rollback'),
    ('dsh', 'control-panel', 'platform:variables:propose', 'Canonical capability consumed by Identity access policy: platform:variables:propose'),
    ('providers', 'control-panel', 'provider:read', 'Canonical capability consumed by Identity access policy: provider:read'),
    ('providers', 'control-panel', 'provider:update', 'Canonical capability consumed by Identity access policy: provider:update'),
    ('providers', 'control-panel', 'provider:test', 'Canonical capability consumed by Identity access policy: provider:test'),
    ('workforce', 'control-panel', 'employee:read', 'Canonical capability consumed by Identity access policy: employee:read'),
    ('workforce', 'control-panel', 'employee:update', 'Canonical capability consumed by Identity access policy: employee:update'),
    ('workforce', 'control-panel', 'leadership:read', 'Canonical capability consumed by Identity access policy: leadership:read'),
    ('workforce', 'control-panel', 'leadership:create', 'Canonical capability consumed by Identity access policy: leadership:create'),
    ('workforce', 'control-panel', 'leadership:update', 'Canonical capability consumed by Identity access policy: leadership:update'),
    ('workforce', 'control-panel', 'employee:create', 'Canonical capability consumed by Identity access policy: employee:create'),
    ('workforce', 'control-panel', 'employee:suspend', 'Canonical capability consumed by Identity access policy: employee:suspend'),
    ('workforce', 'control-panel', 'employee:reactivate', 'Canonical capability consumed by Identity access policy: employee:reactivate'),
    ('workforce', 'control-panel', 'employee.activation:issue', 'Canonical capability consumed by Identity access policy: employee.activation:issue'),
    ('dsh', 'control-panel', 'catalog.taxonomy.manage', 'Canonical capability consumed by Identity access policy: catalog.taxonomy.manage'),
    ('dsh', 'control-panel', 'catalog.product.read', 'Canonical capability consumed by Identity access policy: catalog.product.read'),
    ('dsh', 'control-panel', 'catalog.product.manage', 'Canonical capability consumed by Identity access policy: catalog.product.manage'),
    ('dsh', 'control-panel', 'catalog.product.approve', 'Canonical capability consumed by Identity access policy: catalog.product.approve'),
    ('dsh', 'control-panel', 'catalog.product.publish', 'Canonical capability consumed by Identity access policy: catalog.product.publish'),
    ('dsh', 'control-panel', 'catalog.proposal.read', 'Canonical capability consumed by Identity access policy: catalog.proposal.read'),
    ('dsh', 'control-panel', 'catalog.media.read', 'Canonical capability consumed by Identity access policy: catalog.media.read'),
    ('dsh', 'control-panel', 'catalog.media.upload', 'Canonical capability consumed by Identity access policy: catalog.media.upload'),
    ('dsh', 'control-panel', 'catalog.media.review', 'Canonical capability consumed by Identity access policy: catalog.media.review'),
    ('dsh', 'control-panel', 'catalog.policy.read', 'Canonical capability consumed by Identity access policy: catalog.policy.read'),
    ('dsh', 'control-panel', 'catalog.policy.manage', 'Canonical capability consumed by Identity access policy: catalog.policy.manage'),
    ('dsh', 'control-panel', 'catalog.seed.read', 'Canonical capability consumed by Identity access policy: catalog.seed.read'),
    ('dsh', 'control-panel', 'catalog.bulk.import', 'Canonical capability consumed by Identity access policy: catalog.bulk.import'),
    ('dsh', 'control-panel', 'catalog.bulk.export', 'Canonical capability consumed by Identity access policy: catalog.bulk.export'),
    ('dsh', 'control-panel', 'catalog.bulk.edit', 'Canonical capability consumed by Identity access policy: catalog.bulk.edit'),
    ('dsh', 'control-panel', 'catalog.audit.read', 'Canonical capability consumed by Identity access policy: catalog.audit.read'),
    ('dsh', 'control-panel', 'catalog.cleanup.manage', 'Canonical capability consumed by Identity access policy: catalog.cleanup.manage'),
    ('dsh', 'control-panel', 'analytics.read', 'Canonical capability consumed by Identity access policy: analytics.read'),
    ('dsh', 'control-panel', 'administration.role.read', 'Canonical capability consumed by Identity access policy: administration.role.read'),
    ('dsh', 'control-panel', 'administration.staff.read', 'Canonical capability consumed by Identity access policy: administration.staff.read'),
    ('dsh', 'control-panel', 'administration.audit.read', 'Canonical capability consumed by Identity access policy: administration.audit.read'),
    ('dsh', 'control-panel', 'administration.diagnostics.read', 'Canonical capability consumed by Identity access policy: administration.diagnostics.read'),
    ('dsh', 'control-panel', 'administration.role.request', 'Canonical capability consumed by Identity access policy: administration.role.request'),
    ('dsh', 'control-panel', 'administration.role.approve', 'Canonical capability consumed by Identity access policy: administration.role.approve'),
    ('dsh', 'control-panel', 'administration.staff.request', 'Canonical capability consumed by Identity access policy: administration.staff.request'),
    ('dsh', 'control-panel', 'administration.staff.approve', 'Canonical capability consumed by Identity access policy: administration.staff.approve'),
    ('dsh', 'control-panel', 'administration.rollback.request', 'Canonical capability consumed by Identity access policy: administration.rollback.request'),
    ('dsh', 'control-panel', 'administration.rollback.approve', 'Canonical capability consumed by Identity access policy: administration.rollback.approve')
ON CONFLICT (service, surface, action) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('client'),
            ('partner'),
            ('field'),
            ('captain'),
            ('operator'),
            ('employee'),
            ('workforce.supervise.employee'),
            ('workforce.supervise.field'),
            ('workforce.supervise.captain'),
            ('platform-approver'),
            ('platform-applier'),
            ('platform-rollout-manager')
        ) AS required(name)
        LEFT JOIN identity_roles role
          ON role.name = required.name
        WHERE role.id IS NULL
           OR role.active IS NOT TRUE
    ) THEN
        RAISE EXCEPTION
            'canonical local/employee role vocabulary is incomplete or inactive';
    END IF;
END
$$;