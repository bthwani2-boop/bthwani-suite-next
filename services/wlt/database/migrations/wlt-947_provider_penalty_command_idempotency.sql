-- WLT-947: make provider-penalty POST and REVERSE commands replay-safe and
-- queryable for Workforce saga reconciliation. WLT remains the only writer of
-- penalty money and ledger effects.

ALTER TABLE wlt_provider_penalties
  ADD COLUMN IF NOT EXISTS post_request_hash text,
  ADD COLUMN IF NOT EXISTS reversal_idempotency_key text,
  ADD COLUMN IF NOT EXISTS reversal_request_hash text;

UPDATE wlt_provider_penalties
SET post_request_hash = 'legacy:' || id
WHERE NULLIF(BTRIM(post_request_hash), '') IS NULL;

UPDATE wlt_provider_penalties
SET reversal_idempotency_key = 'legacy-reverse:' || id,
    reversal_request_hash = 'legacy:' || id
WHERE status = 'reversed'
  AND (
    NULLIF(BTRIM(reversal_idempotency_key), '') IS NULL
    OR NULLIF(BTRIM(reversal_request_hash), '') IS NULL
  );

ALTER TABLE wlt_provider_penalties
  ALTER COLUMN post_request_hash SET NOT NULL,
  ADD CONSTRAINT wlt_provider_penalties_post_request_hash_chk
    CHECK (NULLIF(BTRIM(post_request_hash), '') IS NOT NULL),
  ADD CONSTRAINT wlt_provider_penalties_reversal_identity_chk
    CHECK (
      (status = 'posted' AND reversal_idempotency_key IS NULL AND reversal_request_hash IS NULL)
      OR
      (status = 'reversed'
       AND NULLIF(BTRIM(reversal_idempotency_key), '') IS NOT NULL
       AND NULLIF(BTRIM(reversal_request_hash), '') IS NOT NULL)
    );

CREATE UNIQUE INDEX IF NOT EXISTS wlt_provider_penalties_reversal_idempotency_uidx
  ON wlt_provider_penalties(operator_context_id, reversal_idempotency_key)
  WHERE reversal_idempotency_key IS NOT NULL;

COMMENT ON COLUMN wlt_provider_penalties.post_request_hash IS
  'Canonical hash bound to the POST idempotency key; payload drift is rejected.';
COMMENT ON COLUMN wlt_provider_penalties.reversal_idempotency_key IS
  'Canonical end-to-end reversal command identity. One key cannot represent another penalty or payload.';
