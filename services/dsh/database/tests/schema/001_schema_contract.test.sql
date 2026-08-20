-- Canonical DSH schema drift contract.
-- Fails closed when backend-critical columns or identifier types drift.

DO $$
DECLARE
  actual_type TEXT;
  generated_expression TEXT;
  readiness_view_definition TEXT;
BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'schema_migrations ledger is missing';
  END IF;

  IF to_regclass('public.dsh_partners') IS NULL THEN
    RAISE EXCEPTION 'dsh_partners table is missing';
  END IF;

  IF to_regclass('public.dsh_stores') IS NULL THEN
    RAISE EXCEPTION 'dsh_stores table is missing';
  END IF;

  IF to_regclass('public.dsh_partner_offers') IS NULL THEN
    RAISE EXCEPTION 'dsh_partner_offers table is missing';
  END IF;

  SELECT data_type
  INTO actual_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_partners'
    AND column_name = 'archived_at';

  IF actual_type IS DISTINCT FROM 'timestamp with time zone' THEN
    RAISE EXCEPTION 'dsh_partners.archived_at must be TIMESTAMPTZ, found %', COALESCE(actual_type, '<missing>');
  END IF;

  SELECT data_type
  INTO actual_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_stores'
    AND column_name = 'id';

  IF actual_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'dsh_stores.id must be TEXT, found %', COALESCE(actual_type, '<missing>');
  END IF;

  SELECT data_type
  INTO actual_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_partner_offers'
    AND column_name = 'store_id';

  IF actual_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'dsh_partner_offers.store_id must match dsh_stores.id as TEXT, found %', COALESCE(actual_type, '<missing>');
  END IF;

  -- Compile the exact aggregate used by partner readiness. This guards the
  -- runtime owner from drifting back to the non-existent review_status name.
  PERFORM
    COUNT(*),
    COUNT(*) FILTER (WHERE document_status = 'approved')
  FROM dsh_partner_documents
  WHERE partner_id = '__schema_contract_probe__';

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class index_class
    JOIN pg_index index_meta ON index_meta.indexrelid = index_class.oid
    WHERE index_class.relname = 'idx_dsh_partners_archived_at'
      AND index_meta.indisvalid
  ) THEN
    RAISE EXCEPTION 'idx_dsh_partners_archived_at is missing or invalid';
  END IF;

  SELECT pg_get_expr(attribute_default.adbin, attribute_default.adrelid)
  INTO generated_expression
  FROM pg_attribute attribute
  JOIN pg_attrdef attribute_default
    ON attribute_default.adrelid = attribute.attrelid
   AND attribute_default.adnum = attribute.attnum
  WHERE attribute.attrelid = 'public.dsh_stores'::regclass
    AND attribute.attname = 'visibility_status'
    AND attribute.attgenerated = 's';

  IF generated_expression IS NULL
     OR generated_expression NOT LIKE '%published%'
     OR generated_expression LIKE '%status = ''active''::text%' THEN
    RAISE EXCEPTION 'dsh_stores.visibility_status must use only the canonical published lifecycle, found %', COALESCE(generated_expression, '<missing>');
  END IF;

  SELECT pg_get_viewdef('public.dsh_partner_store_readiness_v'::regclass, TRUE)
  INTO readiness_view_definition;
  IF readiness_view_definition NOT LIKE '%published%'
     OR readiness_view_definition LIKE '%status = ''active''::text%' THEN
    RAISE EXCEPTION 'dsh_partner_store_readiness_v must use only the canonical published lifecycle, found %', readiness_view_definition;
  END IF;

  -- Compile the exact view columns consumed by the partner backend so a
  -- migration cannot silently replace the runtime contract with a parallel
  -- readiness shape.
  PERFORM
    store_id,
    display_name,
    publication_decision,
    blocking_reason_codes
  FROM dsh_partner_store_readiness_v
  WHERE partner_id = '__schema_contract_probe__'
  LIMIT 1;

  IF readiness_view_definition LIKE '%STORE_LOGO_MISSING%'
     OR readiness_view_definition LIKE '%STORE_COVER_MISSING%' THEN
    RAISE EXCEPTION 'dsh_partner_store_readiness_v must not make optional media a publication prerequisite';
  END IF;
END
$$;
