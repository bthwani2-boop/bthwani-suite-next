-- dsh-908_jrn_005_mutation_receipt_retention.sql
-- Bound the retention of pseudonymous address-mutation retry receipts.

BEGIN;

ALTER TABLE dsh_client_address_mutation_receipts
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE dsh_client_address_mutation_receipts
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

ALTER TABLE dsh_client_address_mutation_receipts
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_client_address_mutation_receipts_expiry
  ON dsh_client_address_mutation_receipts(expires_at, client_id);

CREATE OR REPLACE FUNCTION dsh_purge_expired_client_address_mutation_receipts(p_limit INTEGER DEFAULT 1000)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'DSH_ADDRESS_RECEIPT_PURGE_LIMIT_INVALID' USING ERRCODE = '22023';
  END IF;

  WITH candidates AS (
    SELECT client_id, idempotency_key
    FROM dsh_client_address_mutation_receipts
    WHERE expires_at <= NOW()
    ORDER BY expires_at ASC, client_id ASC, idempotency_key ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ), deleted AS (
    DELETE FROM dsh_client_address_mutation_receipts AS receipt
    USING candidates
    WHERE receipt.client_id = candidates.client_id
      AND receipt.idempotency_key = candidates.idempotency_key
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$;

COMMENT ON COLUMN dsh_client_address_mutation_receipts.expires_at IS
  'Retry receipt expiry; defaults to 30 days after creation.';

COMMENT ON FUNCTION dsh_purge_expired_client_address_mutation_receipts(INTEGER) IS
  'Deletes an operator-bounded batch of expired JRN-005 mutation receipts.';

COMMIT;
