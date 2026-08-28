-- Workforce-030: strengthen the existing provisioning-case authority into a
-- durable Workforce↔Identity intent/recovery ledger.
--
-- The earlier provisioning-case table was a thin historical record with no
-- retry, lease, request-fingerprint, or remote-outcome semantics. This forward
-- migration preserves the table and upgrades it rather than creating a shadow
-- saga. Existing rows remain provisioning commands; new rows may also record
-- activation and revocation operations.

ALTER TABLE workforce_provisioning_cases
  ADD COLUMN IF NOT EXISTS operation text NOT NULL DEFAULT 'provision',
  ADD COLUMN IF NOT EXISTS request_hash text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS command_idempotency_key text,
  ADD COLUMN IF NOT EXISTS requested_by_actor_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requested_by_role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS correlation_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'INTENT_RECORDED',
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS remote_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS terminal_disposition text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE workforce_provisioning_cases
SET command_idempotency_key = idempotency_key,
    lifecycle_state = CASE
      WHEN status IN ('COMPLETED','FAILED','COMPENSATED','SUPERSEDED') THEN status
      ELSE 'INTENT_RECORDED'
    END,
    request_hash = COALESCE(NULLIF(request_hash, ''), md5(payload::text)),
    next_retry_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE command_idempotency_key IS NULL OR request_hash = '';

ALTER TABLE workforce_provisioning_cases
  ALTER COLUMN command_idempotency_key SET NOT NULL;

ALTER TABLE workforce_provisioning_cases
  ADD CONSTRAINT workforce_provisioning_cases_operation_ck
  CHECK (operation IN ('provision','create_field_agent','create_captain','create_employee',
                       'create_sovereign_leader','create_department_employee',
                       'issue_activation','revoke_activation'));

ALTER TABLE workforce_provisioning_cases
  ADD CONSTRAINT workforce_provisioning_cases_lifecycle_state_ck
  CHECK (lifecycle_state IN ('INTENT_RECORDED','REMOTE_APPLIED','LOCAL_COMMITTED',
                             'RETRY_SCHEDULED','FAILED','SUPERSEDED'));

ALTER TABLE workforce_provisioning_cases
  ADD CONSTRAINT workforce_provisioning_cases_lease_ck
  CHECK ((lease_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)
      OR (lease_token IS NOT NULL AND NULLIF(BTRIM(lease_owner), '') IS NOT NULL
          AND lease_expires_at IS NOT NULL));

ALTER TABLE workforce_provisioning_cases
  ADD CONSTRAINT workforce_provisioning_cases_attempt_ck CHECK (attempt_count >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS workforce_provisioning_cases_context_key_uidx
  ON workforce_provisioning_cases(operator_context_id, command_idempotency_key);

CREATE INDEX IF NOT EXISTS workforce_provisioning_cases_recovery_idx
  ON workforce_provisioning_cases(lifecycle_state, next_retry_at, created_at)
  WHERE lifecycle_state IN ('INTENT_RECORDED','REMOTE_APPLIED','RETRY_SCHEDULED');

COMMENT ON TABLE workforce_provisioning_cases IS
  'Canonical durable intent/recovery ledger for Workforce↔Identity provisioning, activation, and revocation; local intent precedes remote mutation and every command converges through persisted recovery state.';
COMMENT ON COLUMN workforce_provisioning_cases.request_hash IS
  'Immutable request fingerprint; reuse of one command key with a different payload is rejected.';
COMMENT ON COLUMN workforce_provisioning_cases.remote_result IS
  'Authoritative remote outcome metadata used for restart/reconciliation; secret activation codes are never persisted.';
