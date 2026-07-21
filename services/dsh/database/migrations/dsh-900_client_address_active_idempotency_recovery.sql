-- dsh-900_client_address_active_idempotency_recovery.sql
-- Forward recovery for environments that applied the original dsh-056 full-history
-- UNIQUE(client_id, create_idempotency_key) constraint. Soft-deleted addresses must
-- release the idempotency key while active rows remain conflict-safe.

BEGIN;

DO $$
DECLARE
  legacy_constraint_name TEXT;
BEGIN
  SELECT constraint_record.conname
    INTO legacy_constraint_name
  FROM pg_constraint AS constraint_record
  JOIN pg_class AS relation_record
    ON relation_record.oid = constraint_record.conrelid
  JOIN pg_namespace AS namespace_record
    ON namespace_record.oid = relation_record.relnamespace
  WHERE namespace_record.nspname = current_schema()
    AND relation_record.relname = 'dsh_client_addresses'
    AND constraint_record.contype = 'u'
    AND pg_get_constraintdef(constraint_record.oid) = 'UNIQUE (client_id, create_idempotency_key)'
  LIMIT 1;

  IF legacy_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      current_schema(),
      'dsh_client_addresses',
      legacy_constraint_name
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_client_addresses_active_idempotency
  ON dsh_client_addresses(client_id, create_idempotency_key)
  WHERE deleted_at IS NULL;

COMMIT;
