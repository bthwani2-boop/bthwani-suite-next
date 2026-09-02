-- DSH-1081: close the cart mutation receipt invariant without fabricating historical results.
-- Corrupt/legacy receipts whose result_version cannot be proven are preserved as
-- non-replayable evidence and their client/key identity remains permanently blocked.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.dsh_cart_mutation_receipts') IS NULL THEN
    RAISE EXCEPTION 'DSH_CART_MUTATION_RECEIPTS_MISSING' USING ERRCODE = '42P01';
  END IF;

  IF to_regclass('public.dsh_cart_idempotency') IS NOT NULL THEN
    RAISE EXCEPTION 'DSH_LEGACY_CART_IDEMPOTENCY_STILL_PRESENT' USING ERRCODE = '55000';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS dsh_cart_mutation_receipt_quarantine (
    id                  UUID        PRIMARY KEY,
    client_id           TEXT        NOT NULL,
    idempotency_key     TEXT        NOT NULL,
    operation           TEXT        NOT NULL,
    request_fingerprint TEXT        NOT NULL,
    correlation_id      TEXT        NOT NULL,
    cart_id             UUID,
    item_id             UUID,
    result_version      INTEGER,
    result_deleted      BOOLEAN     NOT NULL,
    result_json         JSONB       NOT NULL,
    device_id           TEXT,
    session_id          TEXT,
    original_created_at TIMESTAMPTZ NOT NULL,
    quarantine_reason   TEXT        NOT NULL CHECK (quarantine_reason IN ('invalid_result_version')),
    quarantined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, idempotency_key)
);

COMMENT ON TABLE dsh_cart_mutation_receipt_quarantine IS
  'Forensic evidence for cart mutation keys whose committed result cannot be replayed safely. Rows reserve client_id/idempotency_key and are never business-result authority.';

COMMENT ON COLUMN dsh_cart_mutation_receipt_quarantine.quarantine_reason IS
  'Machine-readable reason the historical receipt is not safe to expose as a committed replay result.';

INSERT INTO dsh_cart_mutation_receipt_quarantine (
    id,
    client_id,
    idempotency_key,
    operation,
    request_fingerprint,
    correlation_id,
    cart_id,
    item_id,
    result_version,
    result_deleted,
    result_json,
    device_id,
    session_id,
    original_created_at,
    quarantine_reason
)
SELECT
    id,
    client_id,
    idempotency_key,
    operation,
    request_fingerprint,
    correlation_id,
    cart_id,
    item_id,
    result_version,
    result_deleted,
    result_json,
    device_id,
    session_id,
    created_at,
    'invalid_result_version'
FROM dsh_cart_mutation_receipts
WHERE result_version IS NULL OR result_version < 1;

DELETE FROM dsh_cart_mutation_receipts
WHERE result_version IS NULL OR result_version < 1;

ALTER TABLE dsh_cart_mutation_receipts
  ALTER COLUMN result_version SET NOT NULL;

ALTER TABLE dsh_cart_mutation_receipts
  DROP CONSTRAINT IF EXISTS dsh_cart_mutation_receipts_result_version_check;

ALTER TABLE dsh_cart_mutation_receipts
  ADD CONSTRAINT dsh_cart_mutation_receipts_result_version_check
  CHECK (result_version >= 1);

CREATE INDEX IF NOT EXISTS idx_dsh_cart_mutation_receipt_quarantine_quarantined
  ON dsh_cart_mutation_receipt_quarantine (quarantined_at DESC, client_id, idempotency_key);

CREATE OR REPLACE FUNCTION dsh_reject_quarantined_cart_mutation_receipt()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_cart_mutation_receipt_quarantine quarantined
    WHERE quarantined.client_id = NEW.client_id
      AND quarantined.idempotency_key = NEW.idempotency_key
  ) THEN
    RAISE EXCEPTION 'DSH_CART_MUTATION_OUTCOME_UNKNOWN'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_reject_quarantined_cart_mutation_receipt
  ON dsh_cart_mutation_receipts;

CREATE TRIGGER trg_dsh_reject_quarantined_cart_mutation_receipt
BEFORE INSERT ON dsh_cart_mutation_receipts
FOR EACH ROW
EXECUTE FUNCTION dsh_reject_quarantined_cart_mutation_receipt();

COMMIT;
