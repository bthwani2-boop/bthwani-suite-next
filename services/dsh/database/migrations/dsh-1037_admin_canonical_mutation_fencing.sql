-- DSH-1037: fence canonical mutation executors with one durable generation.
--
-- The lease owner and expiry remain operational metadata; lease_generation is
-- the only authoritative fencing token. Every successful claim increments it,
-- and every disposition/finalization must present the owner plus that exact
-- generation while the lease is still active.

BEGIN;

ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD COLUMN IF NOT EXISTS lease_generation BIGINT NOT NULL DEFAULT 0;

ALTER TABLE dsh_admin_canonical_mutation_intents
  DROP CONSTRAINT IF EXISTS dsh_admin_canonical_mutation_intents_lease_generation_check;
ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD CONSTRAINT dsh_admin_canonical_mutation_intents_lease_generation_check
  CHECK (lease_generation >= 0);

-- An expired claim cannot be allowed to strand an intent. Advancing the
-- generation invalidates any late executor before the new runtime claims it.
UPDATE dsh_admin_canonical_mutation_intents
SET lease_owner = NULL,
    lease_expires_at = NULL,
    lease_generation = lease_generation + 1,
    updated_at = NOW()
WHERE status <> 'applied'
  AND terminal_failure = FALSE
  AND lease_expires_at IS NOT NULL
  AND lease_expires_at <= NOW();

-- Existing unapplied rows, including approved-request/crash-window rows, must
-- be visible to the canonical worker immediately after cutover. The worker
-- performs Identity readback before deciding whether a remote call is needed.
UPDATE dsh_admin_canonical_mutation_intents
SET next_attempt_at = NOW(),
    updated_at = NOW()
WHERE status <> 'applied'
  AND terminal_failure = FALSE
  AND lease_owner IS NULL
  AND next_attempt_at IS NULL;

DROP INDEX IF EXISTS idx_dsh_admin_mutation_intents_lease_generation;
CREATE INDEX idx_dsh_admin_mutation_intents_lease_generation
  ON dsh_admin_canonical_mutation_intents (lease_generation)
  WHERE status <> 'applied' AND terminal_failure = FALSE;

COMMIT;
