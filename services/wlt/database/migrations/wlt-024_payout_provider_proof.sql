-- WLT-024: provider-backed payout processing and mandatory proof.

ALTER TABLE wlt_payout_requests
  ADD COLUMN IF NOT EXISTS provider_reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_status text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_processed_at timestamptz;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname
    INTO constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'wlt_payout_requests'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  ORDER BY c.conname
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE wlt_payout_requests DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_status_chk CHECK (
    status IN (
      'pending',
      'approved',
      'rejected',
      'provider_pending',
      'processing',
      'provider_result_unknown',
      'completed',
      'failed'
    )
  );

CREATE INDEX IF NOT EXISTS wlt_payout_requests_provider_reference_idx
  ON wlt_payout_requests (provider_reference)
  WHERE provider_reference <> '';

COMMENT ON COLUMN wlt_payout_requests.provider_reference IS
  'External or simulator provider transaction reference required before completion.';
COMMENT ON COLUMN wlt_payout_requests.provider_status IS
  'Last authoritative payout provider status.';
