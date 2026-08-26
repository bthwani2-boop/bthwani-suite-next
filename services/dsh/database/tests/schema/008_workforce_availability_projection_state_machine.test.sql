-- Workforce availability projection state-machine schema contract.
-- This is a DSH read-model contract: DSH owns persistence of the projection,
-- while Workforce owns source_version and the desired notice.

DO $$
DECLARE
  nullable_value text;
  data_type_value text;
BEGIN
  IF to_regclass('public.dsh_provider_availability_projections') IS NULL THEN
    RAISE EXCEPTION 'dsh_provider_availability_projections table is missing';
  END IF;

  SELECT is_nullable, data_type
  INTO nullable_value, data_type_value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_provider_availability_projections'
    AND column_name = 'source_version';
  IF nullable_value <> 'NO' OR data_type_value <> 'bigint' THEN
    RAISE EXCEPTION 'availability projection source_version must be NOT NULL BIGINT, found %/%',
      COALESCE(nullable_value, '<missing>'), COALESCE(data_type_value, '<missing>');
  END IF;

  SELECT is_nullable, data_type
  INTO nullable_value, data_type_value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_provider_availability_projections'
    AND column_name = 'idempotency_key';
  IF nullable_value <> 'NO' OR data_type_value <> 'text' THEN
    RAISE EXCEPTION 'availability projection idempotency_key must be NOT NULL TEXT, found %/%',
      COALESCE(nullable_value, '<missing>'), COALESCE(data_type_value, '<missing>');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'dsh_provider_availability_projections_idempotency_idx'
  ) THEN
    RAISE EXCEPTION 'availability projection deterministic idempotency index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.dsh_provider_availability_projections'::regclass
      AND conname = 'dsh_provider_availability_projections_source_version_check'
  ) THEN
    RAISE EXCEPTION 'availability projection source version check is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.dsh_provider_availability_projections'::regclass
      AND conname = 'dsh_provider_availability_projections_idempotency_identity_check'
  ) THEN
    RAISE EXCEPTION 'availability projection deterministic identity check is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM dsh_provider_availability_projections
    WHERE source_version < 1 OR NULLIF(BTRIM(idempotency_key), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'availability projection contains an unowned or unversioned row';
  END IF;
END
$$;
