-- DSH-1074: durable request identity for control-panel document reviews.
-- A retried review must replay the original decision and review event instead
-- of appending another review for the same request.

BEGIN;

ALTER TABLE dsh_partner_document_reviews
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS request_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_partner_document_reviews_idempotency_uq
  ON dsh_partner_document_reviews
    (operator_context_id, partner_id, document_id, reviewed_by_actor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE dsh_partner_document_reviews
  DROP CONSTRAINT IF EXISTS dsh_partner_document_reviews_idempotency_pair_chk,
  ADD CONSTRAINT dsh_partner_document_reviews_idempotency_pair_chk CHECK (
    (idempotency_key IS NULL AND request_hash IS NULL)
    OR
    (idempotency_key IS NOT NULL AND request_hash IS NOT NULL)
  );

COMMIT;
