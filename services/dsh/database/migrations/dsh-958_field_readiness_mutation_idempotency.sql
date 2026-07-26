-- DSH-958 / JRN-024: durable, actor-scoped mutation identity for field readiness.
-- Business rows are the atomic receipt: exact replays return the original row,
-- while the same key with a changed request hash is rejected.

BEGIN;

ALTER TABLE dsh_field_visits
  ADD COLUMN IF NOT EXISTS create_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS create_request_hash TEXT,
  ADD COLUMN IF NOT EXISTS create_correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS completion_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS completion_request_hash TEXT,
  ADD COLUMN IF NOT EXISTS completion_correlation_id TEXT;

ALTER TABLE dsh_readiness_checks
  ADD COLUMN IF NOT EXISTS mutation_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS mutation_request_hash TEXT,
  ADD COLUMN IF NOT EXISTS mutation_correlation_id TEXT;

ALTER TABLE dsh_readiness_escalations
  ADD COLUMN IF NOT EXISTS create_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS create_request_hash TEXT,
  ADD COLUMN IF NOT EXISTS create_correlation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_field_visits_create_idempotency_uq
  ON dsh_field_visits (field_agent_id, create_idempotency_key)
  WHERE create_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_field_visits_completion_idempotency_uq
  ON dsh_field_visits (field_agent_id, completion_idempotency_key)
  WHERE completion_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_readiness_checks_mutation_idempotency_uq
  ON dsh_readiness_checks (verified_by, mutation_idempotency_key)
  WHERE mutation_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_readiness_escalations_create_idempotency_uq
  ON dsh_readiness_escalations (raised_by, create_idempotency_key)
  WHERE create_idempotency_key IS NOT NULL;

ALTER TABLE dsh_field_visits
  DROP CONSTRAINT IF EXISTS dsh_field_visits_create_idempotency_pair_chk,
  ADD CONSTRAINT dsh_field_visits_create_idempotency_pair_chk CHECK (
    (create_idempotency_key IS NULL AND create_request_hash IS NULL)
    OR
    (create_idempotency_key IS NOT NULL AND create_request_hash IS NOT NULL)
  ),
  DROP CONSTRAINT IF EXISTS dsh_field_visits_completion_idempotency_pair_chk,
  ADD CONSTRAINT dsh_field_visits_completion_idempotency_pair_chk CHECK (
    (completion_idempotency_key IS NULL AND completion_request_hash IS NULL)
    OR
    (completion_idempotency_key IS NOT NULL AND completion_request_hash IS NOT NULL)
  );

ALTER TABLE dsh_readiness_checks
  DROP CONSTRAINT IF EXISTS dsh_readiness_checks_mutation_idempotency_pair_chk,
  ADD CONSTRAINT dsh_readiness_checks_mutation_idempotency_pair_chk CHECK (
    (mutation_idempotency_key IS NULL AND mutation_request_hash IS NULL)
    OR
    (mutation_idempotency_key IS NOT NULL AND mutation_request_hash IS NOT NULL)
  );

ALTER TABLE dsh_readiness_escalations
  DROP CONSTRAINT IF EXISTS dsh_readiness_escalations_create_idempotency_pair_chk,
  ADD CONSTRAINT dsh_readiness_escalations_create_idempotency_pair_chk CHECK (
    (create_idempotency_key IS NULL AND create_request_hash IS NULL)
    OR
    (create_idempotency_key IS NOT NULL AND create_request_hash IS NOT NULL)
  );

COMMIT;
