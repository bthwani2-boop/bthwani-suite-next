-- DSH-1012: replace DSH-authored special-request money with a WLT readback.

ALTER TABLE dsh_special_requests
  ADD COLUMN IF NOT EXISTS wlt_quote_id TEXT,
  ADD COLUMN IF NOT EXISTS wlt_quote_policy_id TEXT,
  ADD COLUMN IF NOT EXISTS wlt_quote_policy_version INTEGER,
  ADD COLUMN IF NOT EXISTS wlt_quote_version INTEGER,
  ADD COLUMN IF NOT EXISTS wlt_quote_amount_minor_units BIGINT,
  ADD COLUMN IF NOT EXISTS wlt_quote_currency TEXT,
  ADD COLUMN IF NOT EXISTS wlt_quote_hash TEXT,
  ADD COLUMN IF NOT EXISTS wlt_quote_expires_at TIMESTAMPTZ;

ALTER TABLE dsh_special_requests
  DROP COLUMN IF EXISTS estimated_amount_reference,
  DROP COLUMN IF EXISTS estimated_amount_minor_units,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS quote_expires_at;

ALTER TABLE dsh_special_requests
  DROP CONSTRAINT IF EXISTS chk_dsh_special_request_wlt_quote_projection;

ALTER TABLE dsh_special_requests
  ADD CONSTRAINT chk_dsh_special_request_wlt_quote_projection CHECK (
    (wlt_quote_id IS NULL AND wlt_quote_policy_id IS NULL AND wlt_quote_policy_version IS NULL
      AND wlt_quote_version IS NULL AND wlt_quote_amount_minor_units IS NULL
      AND wlt_quote_currency IS NULL AND wlt_quote_hash IS NULL AND wlt_quote_expires_at IS NULL)
    OR
    (wlt_quote_id IS NOT NULL AND wlt_quote_policy_id IS NOT NULL AND wlt_quote_policy_version IS NOT NULL
      AND wlt_quote_version IS NOT NULL AND wlt_quote_amount_minor_units IS NOT NULL
      AND wlt_quote_amount_minor_units > 0 AND wlt_quote_currency IS NOT NULL
      AND char_length(wlt_quote_currency) = 3 AND wlt_quote_hash IS NOT NULL
      AND wlt_quote_expires_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_dsh_special_requests_wlt_quote
  ON dsh_special_requests (operator_context_id, wlt_quote_id)
  WHERE wlt_quote_id IS NOT NULL;
