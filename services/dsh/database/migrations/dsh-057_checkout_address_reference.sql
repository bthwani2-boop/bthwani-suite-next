-- dsh-057_checkout_address_reference.sql
-- Preserve the client-owned address identity used for checkout while keeping a
-- text snapshot immutable for fulfillment and historical reads.

BEGIN;

ALTER TABLE dsh_checkout_intents
  ADD COLUMN IF NOT EXISTS delivery_address_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_dsh_checkout_intents_delivery_address'
  ) THEN
    ALTER TABLE dsh_checkout_intents
      ADD CONSTRAINT fk_dsh_checkout_intents_delivery_address
      FOREIGN KEY (delivery_address_id)
      REFERENCES dsh_client_addresses(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_intents_delivery_address
  ON dsh_checkout_intents(delivery_address_id)
  WHERE delivery_address_id IS NOT NULL;

COMMIT;
