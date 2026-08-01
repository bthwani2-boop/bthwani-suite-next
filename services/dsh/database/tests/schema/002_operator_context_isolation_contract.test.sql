-- DSH multi-OperatorContext schema contract.
-- Verifies OperatorContext ownership columns, constraints, indexes, and write guards.

DO $$
DECLARE
  table_name_value TEXT;
  nullable_value TEXT;
  data_type_value TEXT;
  OperatorContext_tables TEXT[] := ARRAY[
    'dsh_partners',
    'dsh_stores',
    'dsh_partner_documents',
    'dsh_partner_document_reviews',
    'dsh_partner_field_visits',
    'dsh_partner_activation_events',
    'dsh_store_actor_scopes'
  ];
BEGIN
  FOREACH table_name_value IN ARRAY OperatorContext_tables LOOP
    SELECT is_nullable, data_type
    INTO nullable_value, data_type_value
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = table_name_value
      AND column_name = 'operator_context_id';

    IF nullable_value IS NULL THEN
      RAISE EXCEPTION '%.operator_context_id is missing', table_name_value;
    END IF;

    IF nullable_value <> 'NO' THEN
      RAISE EXCEPTION '%.operator_context_id must be NOT NULL', table_name_value;
    END IF;

    IF data_type_value <> 'text' THEN
      RAISE EXCEPTION '%.operator_context_id must be TEXT, found %', table_name_value, data_type_value;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_dsh_partners_operatorcontext_legal_identity'
  ) THEN
    RAISE EXCEPTION 'OperatorContext-scoped partner legal identity unique index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_dsh_store_actor_scopes_operatorcontext_actor'
  ) THEN
    RAISE EXCEPTION 'OperatorContext-aware actor scope index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_dsh_stores_operatorcontext'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'dsh_stores OperatorContext enforcement trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_dsh_store_actor_scopes_operatorcontext'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'dsh_store_actor_scopes OperatorContext enforcement trigger is missing';
  END IF;

  IF EXISTS (SELECT 1 FROM dsh_partners WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '') THEN
    RAISE EXCEPTION 'dsh_partners contains unowned OperatorContext rows';
  END IF;

  IF EXISTS (SELECT 1 FROM dsh_stores WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '') THEN
    RAISE EXCEPTION 'dsh_stores contains unowned OperatorContext rows';
  END IF;

  IF EXISTS (SELECT 1 FROM dsh_store_actor_scopes WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '') THEN
    RAISE EXCEPTION 'dsh_store_actor_scopes contains unowned OperatorContext rows';
  END IF;
END
$$;
