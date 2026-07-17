-- WLT-022: Financial ledger integrity and idempotency.
--
-- Every business source may post at most one transaction of a given type.
-- The application compares the complete journal payload on retry and returns
-- the original transaction only when all lines match. Existing duplicates are
-- not silently deleted because their balances may already have affected the
-- accounting truth; migration must stop and force reconciliation instead.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_ledger_transactions
    WHERE reference_type <> '' AND reference_id <> ''
    GROUP BY transaction_type, reference_type, reference_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate WLT ledger source references exist; reconcile them before applying wlt-022';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_ledger_transactions_source_uq
  ON wlt_ledger_transactions (transaction_type, reference_type, reference_id)
  WHERE reference_type <> '' AND reference_id <> '';

CREATE INDEX IF NOT EXISTS wlt_ledger_transactions_created_at_idx
  ON wlt_ledger_transactions (created_at DESC, id DESC);

COMMENT ON INDEX wlt_ledger_transactions_source_uq IS
  'Prevents double posting the same financial business event; retries must match the existing journal payload.';
