-- Behavioral proof for the partner-child tenant ownership trigger.
-- A caller-supplied cross-tenant value must be replaced by the owning partner's
-- tenant before the row is stored.

DO $$
DECLARE
  stored_tenant TEXT;
BEGIN
  DELETE FROM dsh_partner_documents WHERE id = 'doc_ci_tenant_guard';

  INSERT INTO dsh_partner_documents (
    id,
    partner_id,
    tenant_id,
    document_type,
    document_status,
    uploaded_by_actor_id,
    media_ref,
    notes,
    rejection_reason,
    version,
    created_at,
    updated_at
  ) VALUES (
    'doc_ci_tenant_guard',
    'prt_partner_local_001',
    'cross-tenant-attempt',
    'commercial_register',
    'approved',
    'operator-local-001',
    'media_ci_tenant_guard',
    'tenant ownership contract probe',
    '',
    1,
    NOW(),
    NOW()
  );

  SELECT tenant_id
  INTO stored_tenant
  FROM dsh_partner_documents
  WHERE id = 'doc_ci_tenant_guard';

  IF stored_tenant IS DISTINCT FROM 'local-dsh' THEN
    RAISE EXCEPTION
      'partner child tenant trigger failed: expected local-dsh, found %',
      COALESCE(stored_tenant, '<null>');
  END IF;

  DELETE FROM dsh_partner_documents WHERE id = 'doc_ci_tenant_guard';
END
$$;
