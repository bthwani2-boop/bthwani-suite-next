-- Prove that an explicitly established server-side PostgreSQL OperatorContext context
-- fills otherwise-missing root ownership without installing a schema default.
-- Store fallback is exercised by the full Go DB suite under the same context.

SELECT set_config('bthwani.operator_context_id', 'schema-contract-OperatorContext', TRUE);

DO $$
DECLARE
  resolved_OperatorContext TEXT;
BEGIN
  SELECT dsh_trusted_OperatorContext_context() INTO resolved_OperatorContext;
  IF resolved_OperatorContext IS DISTINCT FROM 'schema-contract-OperatorContext' THEN
    RAISE EXCEPTION 'trusted OperatorContext context function failed: %', COALESCE(resolved_OperatorContext, '<null>');
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
  'prt_schema_OperatorContext_context',
  'شريك اختبار سياق المستأجر',
  'OperatorContext Context Contract Partner',
  'شريك سياق المستأجر',
  'commercial_register',
  'SCHEMA-OperatorContext-CONTEXT-001',
  'Schema Contract',
  '+967770000901',
  '',
  'schema-OperatorContext-context@local.test',
  'grocery',
  'draft',
  'schema-contract',
  'system',
  'trusted OperatorContext session context contract',
  1
);

DO $$
DECLARE
  partner_OperatorContext TEXT;
BEGIN
  SELECT operator_context_id INTO partner_OperatorContext
  FROM dsh_partners
  WHERE id = 'prt_schema_OperatorContext_context';

  IF partner_OperatorContext IS DISTINCT FROM 'schema-contract-OperatorContext' THEN
    RAISE EXCEPTION 'trusted partner OperatorContext context failed: %', COALESCE(partner_OperatorContext, '<null>');
  END IF;
END
$$;

DELETE FROM dsh_partners WHERE id = 'prt_schema_OperatorContext_context';
