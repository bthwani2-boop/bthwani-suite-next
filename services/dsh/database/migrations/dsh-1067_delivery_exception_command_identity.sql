-- DSH-1067: make delivery-exception command identity durable and canonical.
-- Existing correlation ids are preserved as trace data and backfill source only;
-- idempotency keys own replay/collision semantics after this cutover.

BEGIN;

ALTER TABLE dsh_delivery_exceptions
  ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE dsh_delivery_exceptions
SET idempotency_key = correlation_id
WHERE idempotency_key IS NULL OR char_length(btrim(idempotency_key)) = 0;

ALTER TABLE dsh_delivery_exceptions
  ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE dsh_delivery_exceptions
  DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_idempotency_key_shape;
ALTER TABLE dsh_delivery_exceptions
  ADD CONSTRAINT dsh_delivery_exceptions_idempotency_key_shape
  CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200);

ALTER TABLE dsh_delivery_exceptions
  DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_correlation_unique;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_exceptions_idempotency
  ON dsh_delivery_exceptions(operator_context_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_correlation
  ON dsh_delivery_exceptions(operator_context_id, correlation_id);

COMMIT;
