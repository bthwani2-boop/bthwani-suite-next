-- Canonical DSH schema drift contract.
-- Fails closed when backend-critical columns or identifier types drift.

DO $$
DECLARE
  actual_type TEXT;
BEGIN
  IF to_regclass('public.runtime_schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'runtime_schema_migrations ledger is missing';
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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class index_class
    JOIN pg_index index_meta ON index_meta.indexrelid = index_class.oid
    WHERE index_class.relname = 'idx_dsh_partners_archived_at'
      AND index_meta.indisvalid
  ) THEN
    RAISE EXCEPTION 'idx_dsh_partners_archived_at is missing or invalid';
  END IF;
END
$$;
