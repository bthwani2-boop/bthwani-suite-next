-- DSH-1070: bind handoff command receipts to the canonical order lifecycle.
-- This is a follow-up because dsh-1069 is already applied and immutable.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dsh_store_captain_handoff_command_receipts'::regclass
      AND conname = 'dsh_store_captain_handoff_command_receipts_order_id_fkey'
  ) THEN
    ALTER TABLE dsh_store_captain_handoff_command_receipts
      ADD CONSTRAINT dsh_store_captain_handoff_command_receipts_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES dsh_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
