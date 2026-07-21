DO $$
DECLARE
  v_reason_nullable TEXT;
  v_unique_index_count INTEGER;
BEGIN
  SELECT is_nullable
  INTO v_reason_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_store_team_member_actions'
    AND column_name = 'reason';

  IF v_reason_nullable IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'dsh_store_team_member_actions.reason must be NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_store_team_member_actions'
      AND column_name = 'correlation_id'
  ) THEN
    RAISE EXCEPTION 'correlation_id audit column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_store_team_member_actions'
      AND column_name = 'idempotency_key'
  ) THEN
    RAISE EXCEPTION 'idempotency_key audit column is missing';
  END IF;

  SELECT COUNT(*)
  INTO v_unique_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'dsh_store_team_member_actions'
    AND indexname = 'uq_dsh_store_team_member_actions_store_idempotency'
    AND indexdef ILIKE '%UNIQUE%'
    AND indexdef ILIKE '%store_id%'
    AND indexdef ILIKE '%idempotency_key%'
    AND indexdef ILIKE '%WHERE (idempotency_key IS NOT NULL)%';

  IF v_unique_index_count <> 1 THEN
    RAISE EXCEPTION 'store-scoped team action idempotency index is missing or malformed';
  END IF;
END
$$;
