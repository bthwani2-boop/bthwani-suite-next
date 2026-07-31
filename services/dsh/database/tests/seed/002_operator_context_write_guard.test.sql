-- Behavioral proof for the partner-child OperatorContext ownership trigger.
-- A caller-supplied cross-OperatorContext value must be replaced by the owning partner's
-- OperatorContext before the row is stored.

DO $$
DECLARE
  stored_OperatorContext TEXT;
BEGIN
  DELETE FROM dsh_partner_documents WHERE id = 'doc_ci_OperatorContext_guard';

  INSERT INTO dsh_partner_documents (
    id,
    partner_id,
    operator_context_id,
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
    'doc_ci_OperatorContext_guard',
    'prt_partner_local_001',
    'cross-OperatorContext-attempt',
    'commercial_register',
    'approved',
    'operator-local-001',
    'media_ci_OperatorContext_guard',
    'OperatorContext ownership contract probe',
    '',
    1,
    NOW(),
    NOW()
  );

  SELECT operator_context_id
  INTO stored_OperatorContext
  FROM dsh_partner_documents
  WHERE id = 'doc_ci_OperatorContext_guard';

  IF stored_OperatorContext IS DISTINCT FROM 'local-dsh' THEN
    RAISE EXCEPTION
      'partner child OperatorContext trigger failed: expected local-dsh, found %',
      COALESCE(stored_OperatorContext, '<null>');
  END IF;

  DELETE FROM dsh_partner_documents WHERE id = 'doc_ci_OperatorContext_guard';
END
$$;
