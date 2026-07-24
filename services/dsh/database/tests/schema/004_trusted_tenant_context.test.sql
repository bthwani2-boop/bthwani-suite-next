-- Prove that an explicitly established server-side PostgreSQL tenant context
-- fills otherwise-missing root ownership without installing a schema default.
-- Store fallback is exercised by the full Go DB suite under the same context.

SELECT set_config('bthwani.tenant_id', 'schema-contract-tenant', TRUE);

DO $$
DECLARE
  resolved_tenant TEXT;
BEGIN
  SELECT dsh_trusted_tenant_context() INTO resolved_tenant;
  IF resolved_tenant IS DISTINCT FROM 'schema-contract-tenant' THEN
    RAISE EXCEPTION 'trusted tenant context function failed: %', COALESCE(resolved_tenant, '<null>');
  END IF;
END
$$;

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
  version
) VALUES (
  'prt_schema_tenant_context',
  'شريك اختبار سياق المستأجر',
  'Tenant Context Contract Partner',
  'شريك سياق المستأجر',
  'commercial_register',
  'SCHEMA-TENANT-CONTEXT-001',
  'Schema Contract',
  '+967770000901',
  '',
  'schema-tenant-context@local.test',
  'grocery',
  'draft',
  'schema-contract',
  'system',
  'trusted tenant session context contract',
  1
);

DO $$
DECLARE
  partner_tenant TEXT;
BEGIN
  SELECT tenant_id INTO partner_tenant
  FROM dsh_partners
  WHERE id = 'prt_schema_tenant_context';

  IF partner_tenant IS DISTINCT FROM 'schema-contract-tenant' THEN
    RAISE EXCEPTION 'trusted partner tenant context failed: %', COALESCE(partner_tenant, '<null>');
  END IF;
END
$$;

DELETE FROM dsh_partners WHERE id = 'prt_schema_tenant_context';
