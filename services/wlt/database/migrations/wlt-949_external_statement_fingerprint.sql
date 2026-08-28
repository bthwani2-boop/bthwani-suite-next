-- WLT-949: bind authoritative statement identity to a server-computed fingerprint.
-- Historical rows may not have a fingerprint because they predate the proof;
-- new imports always populate it from the canonical statement identity.
BEGIN;

ALTER TABLE wlt_external_provider_statements
  ADD COLUMN IF NOT EXISTS statement_fingerprint text;

ALTER TABLE wlt_external_provider_statements
  ADD CONSTRAINT wlt_external_provider_statements_fingerprint_chk
  CHECK (statement_fingerprint IS NULL OR statement_fingerprint ~ '^[a-f0-9]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS wlt_external_provider_statements_fingerprint_uq
  ON wlt_external_provider_statements (operator_context_id, statement_fingerprint)
  WHERE statement_fingerprint IS NOT NULL;

COMMIT;
