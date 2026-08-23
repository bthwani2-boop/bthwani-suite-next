-- DSH-1036: durable canonical administration mutation claims and retry policy.
--
-- DSH remains the maker/checker and reconciliation-intent authority while
-- Identity remains the only canonical RBAC mutation authority. This migration
-- closes crash-window races by giving each retry worker an expiring lease and
-- distinguishes terminally invalid intents from retryable failures.

BEGIN;

ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD COLUMN IF NOT EXISTS lease_owner TEXT;

ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD COLUMN IF NOT EXISTS terminal_failure BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dsh_admin_canonical_mutation_intents
  DROP CONSTRAINT IF EXISTS dsh_admin_canonical_mutation_intents_lease_pair_check;
ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD CONSTRAINT dsh_admin_canonical_mutation_intents_lease_pair_check
  CHECK (
    (lease_owner IS NULL AND lease_expires_at IS NULL)
    OR
    (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
  );

-- Historical retryable failures created before this migration used NULL as an
-- immediate retry marker. Canonical retry semantics now require an explicit
-- due time; NULL is reserved for applied or terminally failed intents.
UPDATE dsh_admin_canonical_mutation_intents
SET next_attempt_at = NOW(), updated_at = NOW()
WHERE status = 'failed'
  AND terminal_failure = FALSE
  AND next_attempt_at IS NULL;

DROP INDEX IF EXISTS idx_dsh_admin_mutation_intents_retry;
CREATE INDEX idx_dsh_admin_mutation_intents_retry
  ON dsh_admin_canonical_mutation_intents (next_attempt_at, created_at)
  WHERE status <> 'applied' AND terminal_failure = FALSE;

CREATE INDEX IF NOT EXISTS idx_dsh_admin_mutation_intents_lease_expiry
  ON dsh_admin_canonical_mutation_intents (lease_expires_at)
  WHERE status <> 'applied' AND terminal_failure = FALSE;

COMMIT;
