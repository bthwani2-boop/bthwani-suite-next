-- Providers-002: preserve the operator context of the authenticated operator for audit
-- and idempotency while keeping external_providers a platform-global registry.
-- Historical rows cannot be attributed reliably and are marked explicitly;
-- this value is never a runtime operator context fallback or write authority.

ALTER TABLE providers_action_audit
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE providers_action_audit
SET operator_context_id = 'historical-unattributed'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE providers_action_audit
  ALTER COLUMN operator_context_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'providers_action_audit'::regclass
      AND conname = 'providers_action_audit_context_nonblank_chk'
  ) THEN
    ALTER TABLE providers_action_audit
      ADD CONSTRAINT providers_action_audit_context_nonblank_chk
      CHECK (btrim(operator_context_id) <> '');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS providers_action_audit_context_created_idx
  ON providers_action_audit(operator_context_id, created_at DESC);

ALTER TABLE providers_idempotency
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE providers_idempotency
SET operator_context_id = 'historical-unattributed'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE providers_idempotency
  ALTER COLUMN operator_context_id SET NOT NULL;

DO $$
DECLARE
  existing_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO existing_definition
  FROM pg_constraint
  WHERE conrelid = 'providers_idempotency'::regclass
    AND contype = 'p'
  LIMIT 1;

  IF existing_definition IS NOT NULL
     AND position('operator_context_id' in existing_definition) = 0 THEN
    ALTER TABLE providers_idempotency
      DROP CONSTRAINT providers_idempotency_pkey;
    existing_definition := NULL;
  END IF;

  IF existing_definition IS NULL THEN
    ALTER TABLE providers_idempotency
      ADD CONSTRAINT providers_idempotency_pkey
      PRIMARY KEY (operator_context_id, actor_id, operation, idempotency_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'providers_idempotency'::regclass
      AND conname = 'providers_idempotency_context_nonblank_chk'
  ) THEN
    ALTER TABLE providers_idempotency
      ADD CONSTRAINT providers_idempotency_context_nonblank_chk
      CHECK (btrim(operator_context_id) <> '');
  END IF;
END $$;
