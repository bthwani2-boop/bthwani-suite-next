-- DSH-1073: durable request identity for partner onboarding evidence.
-- Field onboarding retries must replay the same partner document/visit rather
-- than create duplicate evidence or duplicate activation-audit entries.

BEGIN;

ALTER TABLE dsh_partner_documents
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS request_hash TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '';

ALTER TABLE dsh_partner_field_visits
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS request_hash TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS dsh_partner_documents_upload_idempotency_uq
  ON dsh_partner_documents (operator_context_id, partner_id, uploaded_by_actor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_partner_field_visits_create_idempotency_uq
  ON dsh_partner_field_visits (operator_context_id, partner_id, field_actor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE dsh_partner_documents
  DROP CONSTRAINT IF EXISTS dsh_partner_documents_idempotency_pair_chk,
  ADD CONSTRAINT dsh_partner_documents_idempotency_pair_chk CHECK (
    (idempotency_key IS NULL AND request_hash IS NULL)
    OR
    (idempotency_key IS NOT NULL AND request_hash IS NOT NULL)
  );

ALTER TABLE dsh_partner_field_visits
  DROP CONSTRAINT IF EXISTS dsh_partner_field_visits_idempotency_pair_chk,
  ADD CONSTRAINT dsh_partner_field_visits_idempotency_pair_chk CHECK (
    (idempotency_key IS NULL AND request_hash IS NULL)
    OR
    (idempotency_key IS NOT NULL AND request_hash IS NOT NULL)
  );

COMMENT ON COLUMN dsh_partner_documents.idempotency_key IS
  'Canonical create identity for new onboarding document uploads; NULL is legacy history.';
COMMENT ON COLUMN dsh_partner_field_visits.idempotency_key IS
  'Canonical create identity for new onboarding field visits; NULL is legacy history.';

COMMIT;
