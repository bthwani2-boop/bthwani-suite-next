-- DSH-098: partner onboarding integrity.
-- - partner transitions gain request fingerprints for safe replay;
-- - stores cannot be silently reassigned between partners;
-- - rows that already reference WLT cannot retain raw payout identifiers.

ALTER TABLE dsh_partner_activation_events
  ADD COLUMN IF NOT EXISTS request_hash text NOT NULL DEFAULT '';

-- Historical callers commonly used an empty key. Non-empty duplicate keys are
-- neutralized before the partial unique index is introduced.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY partner_id, idempotency_key
           ORDER BY created_at ASC, id ASC
         ) AS position
  FROM dsh_partner_activation_events
  WHERE btrim(idempotency_key) <> ''
)
UPDATE dsh_partner_activation_events AS event
SET idempotency_key = '',
    request_hash = ''
FROM ranked
WHERE event.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_partner_activation_event_retry_idx
  ON dsh_partner_activation_events(partner_id, idempotency_key)
  WHERE btrim(idempotency_key) <> '';

CREATE OR REPLACE FUNCTION dsh_prevent_store_partner_reassignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.partner_id IS NOT NULL
     AND NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'STORE_PARTNER_REASSIGNMENT_FORBIDDEN'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dsh_stores_partner_reassignment_guard ON dsh_stores;
CREATE TRIGGER dsh_stores_partner_reassignment_guard
BEFORE UPDATE OF partner_id ON dsh_stores
FOR EACH ROW
EXECUTE FUNCTION dsh_prevent_store_partner_reassignment();

-- Rows already linked to a WLT destination retain only masked references in
-- DSH. Legacy rows without a WLT reference are intentionally not destroyed;
-- they remain migration work and cannot be presented as closure evidence.
UPDATE dsh_partners
SET bank_account_number = '',
    bank_iban = '',
    payout_mobile_number = ''
WHERE btrim(payout_destination_id) <> '';

ALTER TABLE dsh_partners
  DROP CONSTRAINT IF EXISTS dsh_partner_wlt_reference_excludes_raw_payout;
ALTER TABLE dsh_partners
  ADD CONSTRAINT dsh_partner_wlt_reference_excludes_raw_payout
  CHECK (
    btrim(payout_destination_id) = '' OR
    (
      btrim(bank_account_number) = '' AND
      btrim(bank_iban) = '' AND
      btrim(payout_mobile_number) = ''
    )
  );
