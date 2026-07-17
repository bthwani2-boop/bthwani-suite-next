-- WLT-025: Enforce the ledger reference tuple used by PostLedgerTransaction as
-- the database idempotency key. Existing duplicates are an accounting blocker
-- and must be reconciled explicitly; this migration never deletes or merges
-- financial records automatically.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_ledger_transactions
    GROUP BY transaction_type, reference_type, reference_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'WLT_LEDGER_REFERENCE_DUPLICATES_EXIST';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_ledger_transactions_reference_uq
  ON wlt_ledger_transactions (transaction_type, reference_type, reference_id);
